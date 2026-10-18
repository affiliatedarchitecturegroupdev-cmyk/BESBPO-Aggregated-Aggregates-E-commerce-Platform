import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PaymentGateway, PaymentMethodKey, Prisma } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { CreditService } from "../credit/credit.service";
import type { CustomerTierName } from "../pricing/pricing.service";
import { PaymentGatewayAdapterFactory } from "./adapters/adapter.factory";
import { eligiblePaymentMethods, PAYFAST_VISIBILITY_KEY } from "./eligibility";
import { GatewayHealthService } from "./gateway-health.service";
import { PaymentsService, type PaymentChoice } from "./payments.service";
import { confirmWithPayfast, isPayfastSource, parseNotification, payfastConfig, signatureMatches } from "./payfast/payfast";
import { UpdatePaymentMethodDto } from "./payment-gateway.dto";

export type NotificationOutcome = "PAID" | "ALREADY_PAID" | "NOT_PAID" | "REJECTED";

const PUBLIC_FIELDS = { methodKey: true, displayName: true, tradeOnly: true, minOrderValue: true, maxOrderValue: true, isEnabled: true, sortOrder: true } as const;

/**
 * Backend half of the payment architecture: every method is a standout tile
 * for the shopper, and this service alone knows whether a tile is eligible
 * for an order (re-checked server-side on every payment) and which gateway
 * processes it (PaymentMethodConfig, admin-editable for failover).
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: PaymentGatewayAdapterFactory,
    private readonly payments: PaymentsService,
    private readonly health: GatewayHealthService,
    private readonly credit: CreditService,
  ) {}

  /** Public: the enabled tiles, without routing details. */
  listPublic() {
    return this.prisma.paymentMethodConfig.findMany({ where: { isEnabled: true }, select: PUBLIC_FIELDS, orderBy: { sortOrder: "asc" } });
  }

  /** Eligible tiles for an order total, at the caller's own tier (from the session, never the request). */
  async eligible(orderTotal: number, isQuoteOnly: boolean, user?: AuthUser, isExpress = false) {
    const configs = await this.prisma.paymentMethodConfig.findMany({ select: { ...PUBLIC_FIELDS, activeGateway: true }, orderBy: { sortOrder: "asc" } });
    const onAccount = !isQuoteOnly && !isExpress && (await this.credit.canCharge(user?.companyId ?? null, orderTotal));
    const result = eligiblePaymentMethods(configs, { orderTotal, isQuoteOnly, isExpress, onAccount, customerTier: await this.tierOf(user?.companyId ?? null) });
    // Routing stays private: the gateway is only used to decide eligibility.
    const strip = (list: typeof configs) => list.map(({ activeGateway: _gateway, ...rest }) => rest);
    return { recommended: strip(result.recommended), available: strip(result.available) };
  }

  /** Starts paying an order — in full, a deposit, or the balance — with the chosen tile (PaymentsService routes it). */
  initiate(orderId: string, methodKey: PaymentMethodKey, user: AuthUser, plan: PaymentChoice = "FULL") {
    return this.payments.startForUser(orderId, methodKey, plan, user);
  }

  /** Admin: full routing table plus which gateways have credentials configured. */
  async routing() {
    const configs = await this.prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: "asc" } });
    const health = await this.health.overview();
    const gateways = Object.values(PaymentGateway).map((gateway) => {
      const h = health.gateways.find((g) => g.gateway === gateway)!;
      return { gateway, ...this.adapters.get(gateway).status(), label: h.label, down: h.down, incident: h.incident, recentErrors: h.recentErrors };
    });
    return { configs, gateways, incidents: health.history, trip: health.trip, payfastPublic: await this.payfastIsPublic() };
  }

  async payfastIsPublic(): Promise<boolean> {
    const row = await this.prisma.siteContent.findUnique({ where: { key: PAYFAST_VISIBILITY_KEY } });
    return (row?.data as { public?: boolean } | null)?.public !== false;
  }

  /** Admin: open PayFast checkout to customers, or back to staff only. */
  async setPayfastPublic(isPublic: boolean, user: AuthUser) {
    await this.prisma.siteContent.upsert({
      where: { key: PAYFAST_VISIBILITY_KEY },
      create: { key: PAYFAST_VISIBILITY_KEY, data: { public: isPublic }, updatedById: user.id },
      update: { data: { public: isPublic }, updatedById: user.id },
    });
    return { payfastPublic: isPublic };
  }

  /** Staff: the latest payment notifications, newest first. */
  recentNotifications(limit = 30) {
    return this.prisma.paymentNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
      select: { id: true, gateway: true, orderId: true, providerReference: true, paymentStatus: true, amount: true, outcome: true, reason: true, createdAt: true, order: { select: { orderNumber: true } } },
    });
  }

  /**
   * A PayFast payment notification (ITN). PayFast is answered 200 whatever
   * happens, so it doesn't keep retrying; every notification is logged with
   * its outcome. An order is marked paid only when all four checks pass:
   * the signature, PayFast as the sender, the amount and merchant against
   * the order, and PayFast's own confirmation.
   */
  async payfastNotification(rawBody: string, sourceIp: string): Promise<NotificationOutcome> {
    const fields = parseNotification(rawBody);
    const get = (key: string) => fields.find(([k]) => k === key)?.[1] ?? "";
    const reference = get("m_payment_id");
    // The reference is the Payment (ledger) ID; checkouts started before the ledger used the order ID.
    let payment = reference ? await this.prisma.payment.findUnique({ where: { id: reference } }) : null;
    // A retried notification for a pre-ledger checkout: the payment it already recorded.
    if (!payment && get("pf_payment_id")) payment = await this.prisma.payment.findFirst({ where: { gateway: "PAYFAST", providerReference: get("pf_payment_id"), orderId: reference } });
    const order = payment
      ? await this.prisma.order.findUnique({ where: { id: payment.orderId } })
      : reference
        ? await this.prisma.order.findUnique({ where: { id: reference } })
        : null;
    const amount = Number(get("amount_gross"));
    const record = (outcome: NotificationOutcome, reason: string | null) =>
      this.prisma.paymentNotification
        .create({
          data: {
            gateway: "PAYFAST",
            orderId: order?.id ?? null,
            providerReference: get("pf_payment_id") || null,
            paymentStatus: get("payment_status") || null,
            amount: Number.isFinite(amount) && get("amount_gross") ? amount : null,
            outcome,
            reason,
            sourceIp: sourceIp || null,
            fields: Object.fromEntries(fields.filter(([key]) => key !== "signature")),
          },
        })
        .then(() => outcome);

    const config = payfastConfig();
    if (!config) return record("REJECTED", "PayFast isn't configured on the API.");
    if (!signatureMatches(fields, config.passphrase)) return record("REJECTED", "Signature didn't match — check AGG_PAYFAST_PASSPHRASE against the PayFast dashboard.");
    if (!(await this.isFromPayfast(sourceIp))) return record("REJECTED", `Not sent from a PayFast server (${sourceIp || "unknown address"}).`);
    if (get("merchant_id") !== config.merchantId) return record("REJECTED", "Merchant ID doesn't match this store's.");
    if (!order || (payment && payment.gateway !== "PAYFAST")) return record("REJECTED", "No PayFast payment or order with that reference.");
    // What this payment was for: the ledger row's amount, or (a pre-ledger checkout) what's outstanding on the order.
    const expected = payment ? Number(payment.amount) : Math.round((Number(order.total) - Number(order.amountPaid)) * 100) / 100;
    if (!Number.isFinite(amount) || Math.abs(amount - expected) > 0.01) {
      return record("REJECTED", `Amount R${get("amount_gross")} doesn't match the R${expected.toFixed(2)} this payment was for.`);
    }
    if (!(await this.payfastConfirms(config, fields))) return record("REJECTED", "PayFast didn't confirm the notification as valid.");

    const status = get("payment_status");
    if (status !== "COMPLETE") {
      if (payment && status === "CANCELLED") await this.prisma.payment.updateMany({ where: { id: payment.id, status: "INITIATED" }, data: { status: "CANCELLED" } });
      return record("NOT_PAID", `Payment status ${status || "missing"} — nothing recorded as paid.`);
    }
    if (payment?.status === "PAID" || (!payment && expected <= 0.01)) return record("ALREADY_PAID", `Payment was already recorded on order ${order.orderNumber}.`);
    if (order.status === "CANCELLED") {
      if (payment) await this.prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date(), providerReference: get("pf_payment_id") || null, failureReason: "Paid after the order was cancelled — refund it." } });
      return record("ALREADY_PAID", "The order had been cancelled — refund this payment from the PayFast dashboard.");
    }
    payment ??= await this.prisma.payment.create({
      data: { orderId: order.id, kind: Number(order.amountPaid) > 0 ? "BALANCE" : "FULL", amount: expected, methodKey: order.paymentMethod ?? "CARD", gateway: "PAYFAST", status: "INITIATED" },
    });
    // The same path for every gateway: ledger, then the order confirmed (or the balance receipted).
    const outcome = await this.payments.markPaid(payment.id, { providerReference: get("pf_payment_id") || null, amount });
    this.logger.log(`PayFast payment ${get("pf_payment_id")} ${outcome} on order ${order.orderNumber}.`);
    return record(outcome === "PAID" ? "PAID" : outcome === "ALREADY_PAID" ? "ALREADY_PAID" : "REJECTED", outcome === "PAID" ? null : outcome);
  }

  /** Separate methods so tests can stand in for PayFast's servers. */
  protected isFromPayfast(ip: string) {
    return isPayfastSource(ip);
  }

  protected payfastConfirms(config: NonNullable<ReturnType<typeof payfastConfig>>, fields: [string, string][]) {
    return confirmWithPayfast(config, fields);
  }

  async update(methodKey: PaymentMethodKey, dto: UpdatePaymentMethodDto) {
    if (dto.fallbackGateway && dto.fallbackGateway === dto.activeGateway) {
      throw new BadRequestException("The fallback gateway must differ from the active one.");
    }
    if (dto.minOrderValue !== null && dto.maxOrderValue !== null && dto.minOrderValue > dto.maxOrderValue) {
      throw new BadRequestException("The minimum order value can't exceed the maximum.");
    }
    try {
      return await this.prisma.paymentMethodConfig.update({
        where: { methodKey },
        data: {
          activeGateway: dto.activeGateway,
          fallbackGateway: dto.fallbackGateway,
          minOrderValue: dto.minOrderValue,
          maxOrderValue: dto.maxOrderValue,
          isEnabled: dto.isEnabled,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new NotFoundException("Payment method not found.");
      throw error;
    }
  }

  private async tierOf(companyId: string | null): Promise<CustomerTierName> {
    if (!companyId) return "RETAIL";
    // A pending or declined company's tier is Retail, so this is only ever a tier staff approved.
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, include: { tier: true } });
    return company?.tier.name ?? "RETAIL";
  }
}
