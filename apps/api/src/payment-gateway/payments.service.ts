import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PaymentGateway, PaymentKind, PaymentMethodKey, Prisma, type Payment, type PaymentLink } from "@aggregates/database";
import { createHash, randomBytes } from "node:crypto";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { accountDueDate } from "../credit/credit";
import { CreditService } from "../credit/credit.service";
import { PrismaService } from "../common/prisma.service";
import { verifySvixSignature } from "../common/svix";
import { OrderDocumentsService } from "../documents/order-documents.service";
import { siteUrl } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { OrdersService } from "../orders/orders.service";
import type { CustomerTierName } from "../pricing/pricing.service";
import { DEFAULT_DEPOSIT_POLICY, depositTerms, normalisePolicy, type DepositPolicy } from "../payments/deposits";
import { PaymentGatewayAdapterFactory } from "./adapters/adapter.factory";
import type { InitiatePaymentResult, ProviderPaymentStatus } from "./adapters/payment-gateway-adapter.interface";
import { eligiblePaymentMethods, isMethodEligible, PAYFAST_VISIBILITY_KEY } from "./eligibility";
import { GatewayHealthService, GATEWAY_LABEL } from "./gateway-health.service";
import { LAYUP_TERMS } from "./layup/layup";
import { classifyResultCode, parsePeachWebhook, peachConfig } from "./peach/peach";
import { stitchReturnUrl } from "./adapters/stitch.adapter";
import { stitchConfig, stitchLive, stitchWebhookLinkId } from "./stitch/stitch";

export const DEPOSIT_POLICY_KEY = "deposit-policy";
/** A payment started but not finished is given up on after this (lay-by plans aside). */
const ABANDON_AFTER_MS = 48 * 3_600_000;
const SYNC_EVERY_MS = 60 * 60_000;
const LINK_DAYS = { default: 7, max: 30 };

export type PaymentChoice = "FULL" | "DEPOSIT" | "BALANCE";
export type PaidOutcome = "PAID" | "ALREADY_PAID" | "AMOUNT_MISMATCH";

const round = (n: number) => Math.round(n * 100) / 100;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const ORDER_INCLUDE = {
  lineItems: { include: { product: { select: { name: true, sku: true, slug: true } } } },
  user: { select: { email: true, name: true } },
} satisfies Prisma.OrderInclude;
type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

type Payer = { kind: "user"; user: AuthUser } | { kind: "link"; link: PaymentLink; token: string };

/**
 * The payments ledger (docs/payments.md). Every payment on an order — in
 * full, a deposit, the balance, a lay-by plan, an EFT staff record — is a
 * Payment row, and the order's amountPaid is their sum. An order is
 * confirmed by its first payment (in full, or the deposit), and can't be
 * dispatched until it's paid in full (OrdersService).
 *
 * Starting a payment picks the tile's gateway from PaymentMethodConfig and
 * fails over to its fallback when the gateway is down (GatewayHealthService),
 * not configured, or errors. A payment is only ever marked paid on the
 * gateway's own word — a signed notification or a direct status check —
 * never the customer's browser.
 */
@Injectable()
export class PaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: PaymentGatewayAdapterFactory,
    private readonly health: GatewayHealthService,
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
    private readonly documents: OrderDocumentsService,
    private readonly credit: CreditService,
  ) {}

  onModuleInit() {
    if (process.env.PAYMENTS_SYNC === "off" || process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.sync().catch((error: Error) => this.logger.warn(`Payments sync: ${error.message}`)), SYNC_EVERY_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // -------------------------------------------------------------------------
  // What an order owes, and how it can be paid
  // -------------------------------------------------------------------------

  async depositPolicy(): Promise<DepositPolicy> {
    const row = await this.prisma.siteContent.findUnique({ where: { key: DEPOSIT_POLICY_KEY } });
    return normalisePolicy((row?.data as Partial<DepositPolicy> | null) ?? DEFAULT_DEPOSIT_POLICY);
  }

  async setDepositPolicy(policy: Partial<DepositPolicy>, user: AuthUser) {
    const normalised = normalisePolicy(policy);
    const data = normalised as unknown as Prisma.InputJsonValue;
    await this.prisma.siteContent.upsert({
      where: { key: DEPOSIT_POLICY_KEY },
      create: { key: DEPOSIT_POLICY_KEY, data, updatedById: user.id },
      update: { data, updatedById: user.id },
    });
    return normalised;
  }

  /** The order's payment position: paid, outstanding, the deposit on offer, lay-by, and the payments so far. */
  async summary(order: LoadedOrder) {
    const total = Number(order.total);
    const amountPaid = Number(order.amountPaid);
    const balance = round(Math.max(0, total - amountPaid));
    const isExpress = this.isExpress(order);
    const deposit = depositTerms(
      {
        total,
        amountPaid,
        status: order.status,
        customerTier: order.customerTier,
        paymentPlan: order.paymentPlan,
        isExpress,
        hasMadeToOrder: order.lineItems.some((l) => l.unitOfSale === "METRE"),
      },
      await this.depositPolicy(),
    );
    const payments = await this.prisma.payment.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "asc" } });
    const layby = payments.find((p) => p.gateway === "LAYUP" && (p.status === "INITIATED" || p.status === "PAID"));
    return {
      total,
      amountPaid,
      balance,
      overpaid: round(Math.max(0, amountPaid - total)),
      paymentPlan: order.paymentPlan,
      depositPercent: order.depositPercent,
      deposit,
      layby: {
        terms: { depositPercent: LAYUP_TERMS.depositPercent, maxMonths: LAYUP_TERMS.maxMonths },
        active: layby ? { status: layby.status, paidSoFar: Number(layby.paidSoFar ?? 0), startedAt: layby.createdAt } : null,
      },
      payments: payments.map((p) => this.publicPayment(p)),
    };
  }

  /** For the order page: the payment summary and the tiles for each way of paying. */
  async options(orderId: string, user: AuthUser) {
    const order = await this.loadFor(orderId, { kind: "user", user });
    const summary = await this.summary(order);
    const configs = await this.prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: "asc" } });
    const tier = await this.tierOf(order.companyId);
    // Trade credit: only a whole new order goes on account, and only within the company's available credit.
    const onAccount = order.status === "PENDING" && Number(order.amountPaid) === 0 && (await this.credit.canCharge(order.companyId, Number(order.total)));
    const tiles = (amount: number, withLayby: boolean) => {
      const { recommended, available } = eligiblePaymentMethods(configs, { orderTotal: amount, customerTier: tier, isQuoteOnly: false, isExpress: this.isExpress(order), onAccount: withLayby && onAccount , bankFirst: stitchLive() });
      const strip = (list: typeof configs) =>
        list
          .filter((c) => withLayby || c.methodKey !== "LAYUP")
          .map((c) => ({ methodKey: c.methodKey, displayName: c.displayName, tradeOnly: c.tradeOnly, minOrderValue: c.minOrderValue, maxOrderValue: c.maxOrderValue, isEnabled: c.isEnabled, sortOrder: c.sortOrder }));
      return { recommended: strip(recommended), available: strip(available) };
    };
    const firstPayment = order.status === "PENDING" && summary.amountPaid === 0 && order.paymentPlan !== "LAYBY";
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      ...summary,
      choices: {
        full: firstPayment ? tiles(summary.total, true) : null,
        deposit: firstPayment && summary.deposit.available ? tiles(summary.deposit.amount, false) : null,
        balance: (summary.amountPaid > 0 || order.paymentPlan === "ACCOUNT") && summary.balance > 0.01 && !["CANCELLED", "DELIVERED"].includes(order.status) ? tiles(summary.balance, false) : null,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Starting a payment (routing and failover)
  // -------------------------------------------------------------------------

  /** A customer (or staff for them) starts paying: in full, a deposit, or the balance. */
  async startForUser(orderId: string, methodKey: PaymentMethodKey, choice: PaymentChoice, user: AuthUser) {
    const order = await this.loadFor(orderId, { kind: "user", user });
    return this.start(order, methodKey, choice, { kind: "user", user });
  }

  private async start(order: LoadedOrder, methodKey: PaymentMethodKey, choice: PaymentChoice, payer: Payer) {
    if (["CANCELLED", "DELIVERED"].includes(order.status)) throw new BadRequestException("This order isn't awaiting payment.");
    const total = Number(order.total);
    const paid = Number(order.amountPaid);
    const balance = round(total - paid);
    if (balance <= 0.01) throw new BadRequestException("This order is already paid in full.");

    // How much, and what kind of payment, is decided here — never taken from the request.
    let kind: PaymentKind;
    let amount: number;
    let depositPercent: number | null = null;
    if (payer.kind === "link") {
      kind = payer.link.kind;
      amount = Math.min(Number(payer.link.amount), balance);
    } else if (choice === "DEPOSIT") {
      const summary = await this.summary(order);
      if (!summary.deposit.available) throw new BadRequestException(summary.deposit.reason);
      kind = "DEPOSIT";
      amount = summary.deposit.amount;
      depositPercent = summary.deposit.percent;
    } else if (paid > 0 || order.paymentPlan === "ACCOUNT") {
      // An order on account is paid off (in one go or in parts) after it's confirmed.
      kind = "BALANCE";
      amount = balance;
    } else {
      if (order.status !== "PENDING") throw new BadRequestException("This order isn't awaiting payment.");
      kind = "FULL";
      amount = total;
    }

    const isLayby = methodKey === "LAYUP";
    if (isLayby && (kind !== "FULL" || paid > 0 || order.status !== "PENDING")) {
      throw new BadRequestException("Lay-by is for paying a whole new order over time — it can't be used for a deposit or a balance.");
    }
    const laybyOpen = await this.prisma.payment.findFirst({ where: { orderId: order.id, gateway: "LAYUP", status: "INITIATED" } });
    if (laybyOpen && !isLayby && Number(laybyOpen.paidSoFar ?? 0) > 0) {
      throw new BadRequestException("This order is being paid on lay-by with LayUp — keep paying your plan there.");
    }

    if (methodKey === "ON_ACCOUNT") return this.chargeToAccount(order, kind, payer);

    const configs = await this.prisma.paymentMethodConfig.findMany();
    const config = configs.find((c) => c.methodKey === methodKey);
    const eligibility = { orderTotal: amount, customerTier: await this.tierOf(order.companyId), isQuoteOnly: false, isExpress: this.isExpress(order) };
    if (!config || !isMethodEligible(configs, methodKey, eligibility)) {
      throw new BadRequestException(`${config?.displayName ?? methodKey} isn't available for this payment.`);
    }
    const isStaff = payer.kind === "user" && STAFF_ROLES.includes(payer.user.role);
    const email = payer.kind === "user" ? payer.user.email : (order.user?.email ?? order.contactEmail ?? "");

    const web = siteUrl();
    // Gateways call the API on its own Render address, so Cloudflare (in front of the storefront) can't block them.
    const api = apiPublicUrl();
    const back = payer.kind === "link" ? `${web}/pay/${payer.token}` : `${web}/orders/${order.id}/confirmation`;

    // The gateways to try, in order: the tile's own, then its fallback.
    const chain = [config.activeGateway, config.fallbackGateway].filter((g): g is PaymentGateway => Boolean(g));
    let firstNote: string | null = null;
    for (const [index, gateway] of chain.entries()) {
      if (gateway === "PAYFAST" && !isStaff && !(await this.payfastIsPublic())) {
        firstNote ??= "Online payment for this method isn't switched on yet, so nothing has been charged. Choose another method, or contact sales and we'll help you pay.";
        continue;
      }
      // Stitch test keys report payments as paid with no real money moving: staff only until the live keys are in.
      if (gateway === "STITCH_DIRECT" && !isStaff && stitchConfig()?.mode === "sandbox") {
        firstNote ??= "Online payment for this method isn't switched on yet, so nothing has been charged. Choose another method, or contact sales and we'll help you pay.";
        continue;
      }
      if (await this.health.downIncident(gateway)) {
        firstNote ??= `${config.displayName} is temporarily unavailable, so nothing has been charged. Choose another method, or try again shortly.`;
        continue;
      }
      // EFT / purchase order: nothing to redirect to — the customer pays by bank and staff record it.
      if (gateway === "MANUAL_EFT") {
        const result = await this.adapters.get(gateway).initiate(this.request(order, "manual", amount, methodKey, email, back, api, gateway));
        await this.prisma.order.update({ where: { id: order.id }, data: this.planUpdate(order, kind, methodKey, depositPercent) });
        return { ...result, method: config.displayName, wasFailover: index > 0, paymentId: null, amount, kind };
      }
      const payment = await this.prisma.payment.create({
        data: { orderId: order.id, kind, amount, methodKey, gateway, status: "INITIATED", wasFailover: index > 0, linkId: payer.kind === "link" ? payer.link.id : null },
      });
      let result: InitiatePaymentResult;
      try {
        result = await this.adapters.get(gateway).initiate(this.request(order, payment.id, amount, methodKey, email, back, api, gateway));
      } catch (error) {
        const reason = (error as Error).message;
        await this.prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: reason.slice(0, 500) } });
        await this.health.recordFailure(gateway, reason);
        firstNote ??= `We couldn't reach ${config.displayName} just now, so nothing has been charged. Try again, or choose another method.`;
        continue;
      }
      if (!result.isLive) {
        // Not configured: not a failure of the gateway, just not an option yet.
        await this.prisma.payment.delete({ where: { id: payment.id } });
        firstNote ??= result.note;
        continue;
      }
      this.health.recordSuccess(gateway);
      await this.prisma.$transaction([
        this.prisma.payment.update({ where: { id: payment.id }, data: { providerCheckoutId: result.providerCheckoutId ?? null } }),
        this.prisma.order.update({ where: { id: order.id }, data: this.planUpdate(order, kind, methodKey, depositPercent) }),
        // Switching from an abandoned lay-by set-up to another way of paying.
        ...(laybyOpen && !isLayby ? [this.prisma.payment.update({ where: { id: laybyOpen.id }, data: { status: "CANCELLED", failureReason: "Customer chose another way to pay." } })] : []),
      ]);
      return { ...result, method: config.displayName, wasFailover: index > 0, paymentId: payment.id, amount, kind };
    }
    return { isLive: false, note: firstNote ?? `${config.displayName} isn't available right now.`, method: config.displayName, wasFailover: false, paymentId: null, amount, kind };
  }

  /**
   * Trade credit (docs/trade-credit.md): the whole order goes on the
   * company's account. Nothing is charged now; the order is confirmed (and can
   * be delivered) and is due within the company's terms. Payments made later
   * (EFT, a payment link) go on the ledger as usual.
   */
  private async chargeToAccount(order: LoadedOrder, kind: PaymentKind, payer: Payer) {
    if (payer.kind !== "user") throw new BadRequestException("A payment link can't be charged to an account.");
    if (kind !== "FULL" || Number(order.amountPaid) > 0 || order.status !== "PENDING") throw new BadRequestException("Only a whole new order can go on account.");
    if (this.isExpress(order)) throw new BadRequestException("AA 60/120 orders are paid there and then — they can't go on account.");
    const isStaff = STAFF_ROLES.includes(payer.user.role);
    if (!isStaff && payer.user.companyId !== order.companyId) throw new BadRequestException("Only your company's own orders can go on its account.");
    const { termsDays } = await this.credit.assertCanCharge(order.companyId, Number(order.total));
    const config = await this.prisma.paymentMethodConfig.findUnique({ where: { methodKey: "ON_ACCOUNT" } });
    if (!config?.isEnabled) throw new BadRequestException("Paying on account isn't switched on right now — choose another way to pay.");
    const dueAt = accountDueDate(new Date(), termsDays);
    await this.prisma.order.update({ where: { id: order.id }, data: { paymentPlan: "ACCOUNT", paymentMethod: "ON_ACCOUNT", depositPercent: null, accountDueAt: dueAt } });
    await this.orders.updateStatus(order.id, { status: "CONFIRMED", paymentMethod: "ON_ACCOUNT" }, { fromPayment: true });
    const due = dueAt.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });
    return {
      isLive: true,
      note: `Order ${order.orderNumber} is on your trade account and confirmed. Payment of R${Number(order.total).toFixed(2)} is due by ${due} (${termsDays}-day terms).`,
      method: config.displayName,
      wasFailover: false,
      paymentId: null,
      amount: Number(order.total),
      kind,
      onAccount: { dueAt, termsDays },
    };
  }

  private request(order: LoadedOrder, paymentId: string, amount: number, methodKey: PaymentMethodKey, email: string, back: string, api: string, gateway: PaymentGateway) {
    const ref = paymentId === "manual" ? "" : `&ref=${paymentId}`;
    return {
      orderId: order.id,
      paymentId,
      orderNumber: order.orderNumber,
      amount,
      methodKey,
      customerEmail: email,
      customerName: order.user?.name ?? null,
      lines: order.lineItems.map((l) => ({ sku: l.product.sku, name: l.product.name, amount: Number(l.lineTotal), link: `${siteUrl()}/products/${l.product.slug}` })),
      returnUrl: `${back}?payment=returned${ref}`,
      cancelUrl: `${back}?payment=cancelled${ref}`,
      notifyUrl: `${api}/api/v1/payment-methods/notify/${gateway === "STITCH_DIRECT" ? "stitch" : gateway.toLowerCase()}`,
    };
  }

  /** The order's plan follows its first payment: in full, a deposit, or lay-by. */
  private planUpdate(order: LoadedOrder, kind: PaymentKind, methodKey: PaymentMethodKey, depositPercent: number | null): Prisma.OrderUpdateInput {
    if (kind === "BALANCE" || kind === "INSTALMENT" || Number(order.amountPaid) > 0) return {};
    return {
      // For sales-by-payment-method reporting (staff can correct it on confirmation).
      paymentMethod: methodKey,
      paymentPlan: methodKey === "LAYUP" ? "LAYBY" : kind === "DEPOSIT" ? "DEPOSIT" : "FULL",
      depositPercent: kind === "DEPOSIT" ? depositPercent : null,
    };
  }

  // -------------------------------------------------------------------------
  // Recording payments
  // -------------------------------------------------------------------------

  /**
   * A gateway says a payment is complete. Idempotent: a second notification
   * for the same payment changes nothing. The amount must match what the
   * payment was for. The first payment confirms the order (the same path as
   * staff confirming it); a later one is receipted, and settles the invoice
   * once the order is paid in full.
   */
  async markPaid(paymentId: string, proof: { providerReference?: string | null; amount?: number }): Promise<PaidOutcome> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException("Payment not found.");
    if (payment.status === "PAID") return "ALREADY_PAID";
    if (proof.amount !== undefined && Math.abs(proof.amount - Number(payment.amount)) > 0.01) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { failureReason: `Gateway reported R${proof.amount.toFixed(2)}, expected R${Number(payment.amount).toFixed(2)} — check before accepting.` } });
      return "AMOUNT_MISMATCH";
    }
    const now = new Date();
    // Only one notification can win the race to mark it paid.
    const won = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "PAID" } },
        data: { status: "PAID", paidAt: now, providerReference: proof.providerReference ?? payment.providerReference, failureReason: null, ...(payment.gateway === "LAYUP" ? { paidSoFar: payment.amount } : {}) },
      });
      if (claimed.count === 0) return false;
      await tx.order.update({ where: { id: payment.orderId }, data: { amountPaid: { increment: payment.amount } } });
      if (payment.linkId) await tx.paymentLink.update({ where: { id: payment.linkId }, data: { paidAt: now } });
      return true;
    });
    if (!won) return "ALREADY_PAID";
    this.health.recordSuccess(payment.gateway);
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: payment.orderId } });
    if (!order.paymentReference && proof.providerReference) {
      await this.prisma.order.update({ where: { id: order.id }, data: { paymentReference: proof.providerReference } });
    }
    if (order.status === "PENDING") {
      // Paid in full, the deposit, or a lay-by plan completed: the order is confirmed (receipt email, paid date).
      await this.orders.updateStatus(order.id, { status: "CONFIRMED", paymentMethod: order.paymentMethod ?? payment.methodKey }, { fromPayment: true });
    } else if (order.status !== "CANCELLED") {
      await this.orders.settleInvoiceIfPaid(order.id);
      await this.notifications.order("PAYMENT_RECEIVED", order.id, { paymentId: payment.id });
    } else {
      this.logger.warn(`Payment ${payment.id} arrived on cancelled order ${order.orderNumber} — refund it from the ${GATEWAY_LABEL[payment.gateway]} dashboard.`);
    }
    this.logger.log(`${GATEWAY_LABEL[payment.gateway]} payment ${payment.id} (R${Number(payment.amount).toFixed(2)}) recorded on ${order.orderNumber}.`);
    return "PAID";
  }

  /** Staff: money arrived by EFT (or cash, or a purchase order honoured) — record it on the ledger. */
  async recordManual(orderId: string, dto: { amount: number; methodKey?: PaymentMethodKey; reference?: string }, staff: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status === "CANCELLED") throw new BadRequestException("This order was cancelled.");
    const balance = round(Number(order.total) - Number(order.amountPaid));
    if (balance <= 0.01) throw new BadRequestException("This order is already paid in full.");
    const amount = round(dto.amount);
    if (!(amount > 0) || amount > balance + 0.01) throw new BadRequestException(`Enter an amount between R0.01 and the outstanding R${balance.toFixed(2)}.`);
    const kind: PaymentKind = Number(order.amountPaid) > 0 || order.paymentPlan === "ACCOUNT" ? "BALANCE" : Math.abs(amount - Number(order.total)) <= 0.01 ? "FULL" : "DEPOSIT";
    const payment = await this.prisma.payment.create({
      data: { orderId, kind, amount, methodKey: dto.methodKey ?? order.paymentMethod ?? "EFT_PO", gateway: "MANUAL_EFT", status: "INITIATED", recordedById: staff.id, providerReference: dto.reference?.trim() || null },
    });
    if (kind === "DEPOSIT" && order.status === "PENDING") {
      await this.prisma.order.update({ where: { id: orderId }, data: { paymentPlan: "DEPOSIT", depositPercent: Math.round((amount / Number(order.total)) * 100) } });
    }
    await this.markPaid(payment.id, { providerReference: dto.reference?.trim() || null });
    return this.ledger(orderId);
  }

  /** Ask the gateway how a started payment stands, and act on the answer. */
  async refresh(payment: Payment): Promise<Payment> {
    if (payment.status !== "INITIATED" || !payment.providerCheckoutId) return payment;
    const adapter = this.adapters.get(payment.gateway);
    if (!adapter.checkStatus) return payment;
    let status: ProviderPaymentStatus;
    try {
      status = await adapter.checkStatus(payment.providerCheckoutId, Number(payment.amount));
    } catch (error) {
      this.logger.warn(`Couldn't check ${GATEWAY_LABEL[payment.gateway]} payment ${payment.id}: ${(error as Error).message}`);
      return payment;
    }
    await this.apply(payment, status);
    return this.prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  }

  private async apply(payment: Payment, status: ProviderPaymentStatus) {
    if (status.status === "PAID") {
      await this.markPaid(payment.id, { providerReference: status.providerReference, amount: payment.gateway === "LAYUP" ? undefined : status.amount });
    } else if (status.status === "FAILED") {
      await this.prisma.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { status: "FAILED", failureReason: status.detail?.slice(0, 500) ?? "Not completed." } });
      // A lay-by plan that ended unpaid: the order can be paid another way again.
      if (payment.gateway === "LAYUP") await this.prisma.order.updateMany({ where: { id: payment.orderId, paymentPlan: "LAYBY", status: "PENDING" }, data: { paymentPlan: "FULL" } });
    } else if (payment.gateway === "LAYUP" && status.paidSoFar !== undefined) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { paidSoFar: status.paidSoFar } });
    }
  }

  /** The customer is back from a gateway's page: check their started payments, then show where things stand. */
  async refreshOrder(orderId: string, user: AuthUser) {
    const order = await this.loadFor(orderId, { kind: "user", user });
    await this.refreshPending(order.id);
    return this.options(order.id, user);
  }

  private async refreshPending(orderId: string) {
    const pending = await this.prisma.payment.findMany({ where: { orderId, status: "INITIATED", providerCheckoutId: { not: null } } });
    for (const payment of pending) await this.refresh(payment);
  }

  /**
   * Hourly: lay-by plans' progress with LayUp, payments whose notification
   * may have been missed, and started payments abandoned for two days.
   */
  async sync() {
    const pending = await this.prisma.payment.findMany({ where: { status: "INITIATED", providerCheckoutId: { not: null } }, take: 500 });
    for (const payment of pending) await this.refresh(payment);
    const expired = await this.prisma.payment.updateMany({
      where: { status: "INITIATED", gateway: { not: "LAYUP" }, createdAt: { lt: new Date(Date.now() - ABANDON_AFTER_MS) } },
      data: { status: "EXPIRED" },
    });
    return { checked: pending.length, expired: expired.count };
  }

  // -------------------------------------------------------------------------
  // Gateway notifications
  // -------------------------------------------------------------------------

  /** Peach's webhook: signed with the secret token. Peach's status API is asked to confirm; the signed result stands in if it can't be reached. */
  async peachWebhook(rawBody: string, sourceIp: string) {
    const config = peachConfig();
    if (!config) return this.log("PEACH", null, "REJECTED", "Peach isn't configured on the API.", sourceIp, {});
    const hook = parsePeachWebhook(rawBody, config.secretToken);
    if (!hook.valid) return this.log("PEACH", null, "REJECTED", "Signature didn't match — check PEACH_SECRET_TOKEN.", sourceIp, hook.fields);
    const payment = hook.paymentId ? await this.prisma.payment.findUnique({ where: { id: hook.paymentId } }) : null;
    if (!payment || payment.gateway !== "PEACH") return this.log("PEACH", null, "REJECTED", "No Peach payment with that reference.", sourceIp, hook.fields);
    let status: ProviderPaymentStatus | null = null;
    if (payment.providerCheckoutId) {
      status = await this.adapters
        .get("PEACH")
        .checkStatus!(payment.providerCheckoutId, Number(payment.amount))
        .catch(() => null);
    }
    status ??= { status: classifyResultCode(hook.resultCode), amount: hook.amount, providerReference: hook.transactionId, detail: hook.resultCode };
    return this.settle(payment, status, sourceIp, hook.fields);
  }

  /**
   * Stitch Express's `payment.paid` webhook (Svix-signed). It names the
   * payment link; the link's status from Stitch's API decides the outcome.
   * Retries are harmless: a payment is only marked paid once.
   */
  async stitchWebhook(rawBody: string, headers: { id?: string; timestamp?: string; signature?: string }, sourceIp: string) {
    const secret = process.env.STITCH_WEBHOOK_SECRET?.trim();
    if (!secret) return this.log("STITCH_DIRECT", null, "REJECTED", "STITCH_WEBHOOK_SECRET isn't set on the API.", sourceIp, {});
    if (!verifySvixSignature(rawBody, headers, secret)) return this.log("STITCH_DIRECT", null, "REJECTED", "Signature didn't match — check STITCH_WEBHOOK_SECRET.", sourceIp, {});
    let payload: unknown = null;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return this.log("STITCH_DIRECT", null, "REJECTED", "Not JSON.", sourceIp, {});
    }
    const linkId = stitchWebhookLinkId(payload);
    const p = payload as { id?: unknown; type?: unknown; amount?: unknown } | null;
    const fields = { linkId: linkId ?? "", stitchPaymentId: typeof p?.id === "string" ? p.id : "", type: typeof p?.type === "string" ? p.type : "", deliveryId: headers.id ?? "" };
    if (!linkId) return this.log("STITCH_DIRECT", null, "REJECTED", "Not a payment-link payment (no linkId).", sourceIp, fields);
    const payment = await this.prisma.payment.findFirst({ where: { gateway: "STITCH_DIRECT", providerCheckoutId: linkId } });
    if (!payment) return this.log("STITCH_DIRECT", null, "REJECTED", "No Stitch payment for that payment link.", sourceIp, fields);
    const status = await this.adapters
      .get("STITCH_DIRECT")
      .checkStatus!(linkId, Number(payment.amount))
      .catch((error: Error) => ({ status: "PENDING" as const, detail: `Status check failed: ${error.message}` }));
    return this.settle(payment, status, sourceIp, fields);
  }

  /**
   * The customer is back on /payments/return from Stitch. Finds their payment
   * by our reference or Stitch's link ID, asks Stitch how it stands, and
   * returns only what the return page shows — no names or addresses.
   */
  async stitchReturn(ref: string | undefined, linkIds: string[]) {
    const ids = linkIds.filter((id) => typeof id === "string" && id.length > 0 && id.length <= 100).slice(0, 4);
    const or: Prisma.PaymentWhereInput[] = [...(ref ? [{ id: ref }] : []), ...ids.map((id) => ({ providerCheckoutId: id }))];
    if (!or.length) throw new NotFoundException("We couldn't tell which payment this was.");
    const found = await this.prisma.payment.findFirst({ where: { gateway: "STITCH_DIRECT", OR: or } });
    if (!found) throw new NotFoundException("We couldn't find that payment.");
    const payment = await this.refresh(found);
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: payment.orderId }, select: { id: true, orderNumber: true, status: true } });
    return { status: payment.status, amount: Number(payment.amount), orderId: order.id, orderNumber: order.orderNumber, orderStatus: order.status, viaLink: Boolean(payment.linkId) };
  }

  /** Admin → Payments → Stitch: are the credentials working, and what's registered with Stitch. */
  async stitchSetup() {
    const adapter = this.adapters.stitchAdapter();
    const stitch = adapter.stitch();
    const returnUrl = stitchReturnUrl();
    const webhookUrl = `${apiPublicUrl()}/api/v1/payment-methods/notify/stitch`;
    const base = { returnUrl, webhookUrl, webhookSecretSet: Boolean(process.env.STITCH_WEBHOOK_SECRET?.trim()), missingEnvVars: adapter.status().missingEnvVars };
    if (!stitch) return { ...base, configured: false, connected: false, mode: null, redirectUrls: [] as string[], returnUrlRegistered: false, error: null as string | null };
    try {
      const redirectUrls = await stitch.redirectUrls();
      return { ...base, configured: true, connected: true, mode: stitch.mode, redirectUrls, returnUrlRegistered: redirectUrls.includes(returnUrl), error: null };
    } catch (error) {
      return { ...base, configured: true, connected: false, mode: stitch.mode, redirectUrls: [], returnUrlRegistered: false, error: (error as Error).message };
    }
  }

  async registerStitchRedirect() {
    const stitch = this.adapters.stitchAdapter().stitch();
    if (!stitch) throw new BadRequestException("Set STITCH_CLIENT_ID and STITCH_CLIENT_SECRET on the API first.");
    await stitch.registerRedirectUrl(stitchReturnUrl()).catch((error: Error) => {
      throw new BadRequestException(error.message);
    });
    return this.stitchSetup();
  }

  /** Registers our webhook with Stitch. The signing secret is shown to the admin once, to put in Render — it isn't stored. */
  async registerStitchWebhook() {
    const stitch = this.adapters.stitchAdapter().stitch();
    if (!stitch) throw new BadRequestException("Set STITCH_CLIENT_ID and STITCH_CLIENT_SECRET on the API first.");
    const url = `${apiPublicUrl()}/api/v1/payment-methods/notify/stitch`;
    const secret = await stitch.registerWebhook(url).catch((error: Error) => {
      const already = /HTTP 409/.test(error.message);
      throw new BadRequestException(already ? "This webhook is already registered with Stitch. If STITCH_WEBHOOK_SECRET isn't set, ask express-support@stitch.money to remove it, then register again." : error.message);
    });
    return { url, secret };
  }

  private async settle(payment: Payment, status: ProviderPaymentStatus, sourceIp: string, fields: Record<string, string>) {
    if (status.status === "PAID") {
      const outcome = await this.markPaid(payment.id, { providerReference: status.providerReference, amount: status.amount });
      if (outcome === "AMOUNT_MISMATCH") return this.log(payment.gateway, payment, "REJECTED", `Amount R${status.amount?.toFixed(2)} doesn't match the payment R${Number(payment.amount).toFixed(2)}.`, sourceIp, fields, status);
      return this.log(payment.gateway, payment, outcome, null, sourceIp, fields, status);
    }
    await this.apply(payment, status);
    return this.log(payment.gateway, payment, "NOT_PAID", status.detail ?? status.status, sourceIp, fields, status);
  }

  private async log(gateway: PaymentGateway, payment: Payment | null, outcome: string, reason: string | null, sourceIp: string, fields: Record<string, string>, status?: ProviderPaymentStatus) {
    await this.prisma.paymentNotification.create({
      data: {
        gateway,
        orderId: payment?.orderId ?? null,
        providerReference: status?.providerReference ?? null,
        paymentStatus: status?.status ?? null,
        amount: status?.amount ?? null,
        outcome,
        reason,
        sourceIp: sourceIp || null,
        fields,
      },
    });
    return outcome;
  }

  // -------------------------------------------------------------------------
  // Payment links (staff send; the customer pays without signing in)
  // -------------------------------------------------------------------------

  async createLink(orderId: string, dto: { kind: PaymentKind; amount?: number; note?: string; validDays?: number; send?: boolean }, staff: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException("Order not found.");
    if (["CANCELLED", "DELIVERED"].includes(order.status)) throw new BadRequestException("This order isn't awaiting payment.");
    const summary = await this.summary(order);
    if (summary.balance <= 0.01) throw new BadRequestException("This order is already paid in full.");
    let amount: number;
    if (dto.amount !== undefined) amount = round(dto.amount);
    else if (dto.kind === "DEPOSIT") {
      if (!summary.deposit.available) throw new BadRequestException(`${summary.deposit.reason} Enter an amount instead.`);
      amount = summary.deposit.amount;
    } else amount = summary.balance;
    if (!(amount > 0) || amount > summary.balance + 0.01) throw new BadRequestException(`The amount must be between R0.01 and the outstanding R${summary.balance.toFixed(2)}.`);
    const kind: PaymentKind = summary.amountPaid > 0 ? "BALANCE" : Math.abs(amount - summary.total) <= 0.01 ? "FULL" : dto.kind === "INSTALMENT" ? "INSTALMENT" : "DEPOSIT";
    const days = Math.min(Math.max(Math.round(dto.validDays ?? LINK_DAYS.default), 1), LINK_DAYS.max);
    const token = randomBytes(24).toString("base64url");
    const link = await this.prisma.paymentLink.create({
      data: { orderId, tokenHash: hashToken(token), kind, amount, note: dto.note?.trim() || null, expiresAt: new Date(Date.now() + days * 86_400_000), createdById: staff.id },
    });
    const url = `${siteUrl()}/pay/${token}`;
    const to = order.user?.email ?? order.contactEmail;
    if (dto.send && to) {
      await this.notifications.order("PAYMENT_LINK_SENT", order.id, { payLink: { url, amount: link.amount, kind: link.kind, expiresAt: link.expiresAt, note: link.note } });
    }
    // The link itself is shown once, here — only its hash is kept.
    return { id: link.id, url, kind, amount, expiresAt: link.expiresAt, emailedTo: dto.send && to ? to : null };
  }

  async revokeLink(linkId: string) {
    const link = await this.prisma.paymentLink.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException("Payment link not found.");
    if (link.paidAt) throw new BadRequestException("This link has been paid.");
    await this.prisma.paymentLink.update({ where: { id: linkId }, data: { revokedAt: new Date() } });
    return { revoked: true };
  }

  /** Public: what a payment link is for. Only what's needed to pay — no delivery address or contact details. */
  async linkView(token: string, refresh = false) {
    const { link, order } = await this.linkFor(token, { allowPaid: true });
    if (refresh) await this.refreshPending(order.id);
    const fresh = await this.prisma.paymentLink.findUniqueOrThrow({ where: { id: link.id } });
    const current = await this.prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE });
    const balance = round(Number(current.total) - Number(current.amountPaid));
    const amount = Math.min(Number(fresh.amount), Math.max(balance, 0));
    const configs = await this.prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: "asc" } });
    const { recommended, available } = eligiblePaymentMethods(configs, { orderTotal: amount, customerTier: await this.tierOf(current.companyId), isQuoteOnly: false, isExpress: this.isExpress(current) , bankFirst: stitchLive() });
    const tiles = (list: typeof configs) => list.filter((c) => c.methodKey !== "LAYUP").map((c) => ({ methodKey: c.methodKey, displayName: c.displayName, tradeOnly: c.tradeOnly, minOrderValue: c.minOrderValue, maxOrderValue: c.maxOrderValue, isEnabled: c.isEnabled, sortOrder: c.sortOrder }));
    const paid = Boolean(fresh.paidAt) || balance <= 0.01;
    return {
      orderNumber: current.orderNumber,
      customerName: current.user?.name ?? null,
      kind: fresh.kind,
      amount,
      note: fresh.note,
      expiresAt: fresh.expiresAt,
      paid,
      total: Number(current.total),
      amountPaid: Number(current.amountPaid),
      balance: Math.max(balance, 0),
      lines: current.lineItems.map((l) => ({ name: l.product.name, quantity: l.quantity, unitOfSale: l.unitOfSale, lineTotal: Number(l.lineTotal) })),
      subtotal: Number(current.subtotal),
      deliveryFee: Number(current.deliveryFee),
      expressFee: current.expressFee !== null ? Number(current.expressFee) : null,
      methods: paid ? { recommended: [], available: [] } : { recommended: tiles(recommended), available: tiles(available) },
    };
  }

  async payLink(token: string, methodKey: PaymentMethodKey) {
    if (methodKey === "LAYUP") throw new BadRequestException("Lay-by can't be used with a payment link.");
    const { link, order } = await this.linkFor(token, { allowPaid: false });
    return this.start(order, methodKey, "FULL", { kind: "link", link, token });
  }

  async linkProforma(token: string) {
    const { link, order } = await this.linkFor(token, { allowPaid: false });
    return this.documents.proforma(order.id, { amount: Number(link.amount), kind: link.kind, validUntil: link.expiresAt });
  }

  private async linkFor(token: string, opts: { allowPaid: boolean }) {
    const link = await this.prisma.paymentLink.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!link || link.revokedAt) throw new NotFoundException("This payment link isn't valid. Ask our team for a new one.");
    if (link.expiresAt < new Date() && !link.paidAt) throw new BadRequestException("This payment link has expired. Ask our team for a new one.");
    if (link.paidAt && !opts.allowPaid) throw new BadRequestException("This link has already been paid — thank you.");
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: link.orderId }, include: ORDER_INCLUDE });
    if (order.status === "CANCELLED") throw new BadRequestException("This order was cancelled.");
    return { link, order };
  }

  // -------------------------------------------------------------------------
  // Staff views
  // -------------------------------------------------------------------------

  async ledger(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException("Order not found.");
    const summary = await this.summary(order);
    const links = await this.prisma.paymentLink.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } });
    const payments = await this.prisma.payment.findMany({ where: { orderId }, orderBy: { createdAt: "asc" } });
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      ...summary,
      payments: payments.map((p) => ({ ...this.publicPayment(p), gatewayLabel: GATEWAY_LABEL[p.gateway], providerCheckoutId: p.providerCheckoutId, failureReason: p.failureReason, recordedById: p.recordedById })),
      links: links.map((l) => ({
        id: l.id,
        kind: l.kind,
        amount: Number(l.amount),
        note: l.note,
        createdAt: l.createdAt,
        expiresAt: l.expiresAt,
        paidAt: l.paidAt,
        revokedAt: l.revokedAt,
        state: l.paidAt ? "PAID" : l.revokedAt ? "REVOKED" : l.expiresAt < new Date() ? "EXPIRED" : "OPEN",
      })),
    };
  }

  /** Staff: orders with money still owed after a deposit, and lay-by plans in progress. */
  async outstanding() {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [
          { status: { in: ["PENDING", "CONFIRMED"] }, OR: [{ paymentPlan: { in: ["DEPOSIT", "LAYBY"] } }, { amountPaid: { gt: 0 } }] },
          // On account: owed until paid, wherever the delivery is.
          { paymentPlan: "ACCOUNT", status: { not: "CANCELLED" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, orderNumber: true, status: true, total: true, amountPaid: true, paymentPlan: true, depositPercent: true, accountDueAt: true, createdAt: true, user: { select: { name: true, email: true } }, company: { select: { name: true } } },
    });
    return orders
      .map((o) => ({ ...o, total: Number(o.total), amountPaid: Number(o.amountPaid), balance: round(Number(o.total) - Number(o.amountPaid)) }))
      .filter((o) => o.balance > 0.01);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private publicPayment(p: Payment) {
    return {
      id: p.id,
      kind: p.kind,
      amount: Number(p.amount),
      methodKey: p.methodKey,
      gateway: p.gateway,
      status: p.status,
      paidSoFar: p.paidSoFar !== null ? Number(p.paidSoFar) : null,
      providerReference: p.providerReference,
      createdAt: p.createdAt,
      paidAt: p.paidAt,
    };
  }

  private isExpress(order: { expressFee: Prisma.Decimal | null; expressDeclinedAt: Date | null }) {
    return order.expressFee !== null && Number(order.expressFee) > 0 && !order.expressDeclinedAt;
  }

  private async loadFor(orderId: string, payer: Payer): Promise<LoadedOrder> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (payer.kind === "user") {
      const { user } = payer;
      const isOwner = order && (order.userId === user.id || (order.companyId !== null && order.companyId === user.companyId));
      if (!order || !(isOwner || STAFF_ROLES.includes(user.role))) throw new NotFoundException("Order not found.");
    }
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  private async payfastIsPublic(): Promise<boolean> {
    const row = await this.prisma.siteContent.findUnique({ where: { key: PAYFAST_VISIBILITY_KEY } });
    return (row?.data as { public?: boolean } | null)?.public !== false;
  }

  private async tierOf(companyId: string | null): Promise<CustomerTierName> {
    if (!companyId) return "RETAIL";
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, include: { tier: true } });
    return company?.tier.name ?? "RETAIL";
  }
}


/** Gateways call the API on its own Render address, so Cloudflare (in front of the storefront) can't block them. */
export function apiPublicUrl(): string {
  return (process.env.RENDER_EXTERNAL_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? siteUrl()).replace(/\/+$/, "");
}
