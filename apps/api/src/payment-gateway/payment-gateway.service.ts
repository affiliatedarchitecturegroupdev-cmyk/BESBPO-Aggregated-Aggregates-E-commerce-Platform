import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PaymentGateway, PaymentMethodKey, Prisma } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import type { CustomerTierName } from "../pricing/pricing.service";
import { PaymentGatewayAdapterFactory } from "./adapters/adapter.factory";
import { eligiblePaymentMethods, isMethodEligible } from "./eligibility";
import type { UpdateOrderStatusDto } from "../orders/dto/create-order.dto";
import { OrdersService } from "../orders/orders.service";
import { confirmWithPayfast, isPayfastSource, parseNotification, payfastConfig, signatureMatches } from "./payfast/payfast";
import { UpdatePaymentMethodDto } from "./payment-gateway.dto";

/** SiteContent key for the switch that opens PayFast checkout to customers (staff can always use it). */
const PAYFAST_VISIBILITY_KEY = "payfast-checkout";

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
    private readonly orders: OrdersService,
  ) {}

  /** Public: the enabled tiles, without routing details. */
  listPublic() {
    return this.prisma.paymentMethodConfig.findMany({ where: { isEnabled: true }, select: PUBLIC_FIELDS, orderBy: { sortOrder: "asc" } });
  }

  /** Eligible tiles for an order total, at the caller's own tier (from the session, never the request). */
  async eligible(orderTotal: number, isQuoteOnly: boolean, user?: AuthUser) {
    const configs = await this.prisma.paymentMethodConfig.findMany({ select: PUBLIC_FIELDS, orderBy: { sortOrder: "asc" } });
    return eligiblePaymentMethods(configs, { orderTotal, isQuoteOnly, customerTier: await this.tierOf(user?.companyId ?? null) });
  }

  async initiate(orderId: string, methodKey: PaymentMethodKey, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    const isOwner = order && (order.userId === user.id || (order.companyId !== null && order.companyId === user.companyId));
    if (!order || !(isOwner || STAFF_ROLES.includes(user.role))) throw new NotFoundException("Order not found.");
    if (order.status !== "PENDING") throw new BadRequestException("This order isn't awaiting payment.");

    const configs = await this.prisma.paymentMethodConfig.findMany();
    const config = configs.find((c) => c.methodKey === methodKey);
    const input = { orderTotal: Number(order.total), customerTier: await this.tierOf(order.companyId), isQuoteOnly: false };
    if (!config || !isMethodEligible(configs, methodKey, input)) {
      throw new BadRequestException(`${config?.displayName ?? methodKey} isn't available for this order.`);
    }

    const webUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaggregates.store").replace(/\/+$/, "");
    // Gateways call the API on its own Render address, so Cloudflare (in front of the storefront) can't block them.
    const apiUrl = (process.env.RENDER_EXTERNAL_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? webUrl).replace(/\/+$/, "");
    const request = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      methodKey,
      customerEmail: user.email,
      returnUrl: `${webUrl}/orders/${order.id}/confirmation?payment=returned`,
      cancelUrl: `${webUrl}/orders/${order.id}/confirmation?payment=cancelled`,
      notifyUrl: `${apiUrl}/api/v1/payment-methods/notify/${config.activeGateway.toLowerCase()}`,
    };
    // Until an admin opens PayFast to customers (after a real test payment), only staff can pay through it.
    if (config.activeGateway === "PAYFAST" && !STAFF_ROLES.includes(user.role) && !(await this.payfastIsPublic())) {
      return {
        isLive: false,
        note: `Online payment for this method isn't switched on yet, so order ${order.orderNumber} hasn't been charged. Choose another method, or contact sales and we'll help you pay.`,
        method: config.displayName,
        wasFailover: false,
      };
    }
    // Record the method chosen, for sales-by-payment-method reporting (staff can correct it on confirmation).
    await this.prisma.order.update({ where: { id: order.id }, data: { paymentMethod: methodKey } });
    const primary = await this.adapters.get(config.activeGateway).initiate(request);
    // One level of automatic failover while the primary gateway isn't live.
    if (!primary.isLive && config.fallbackGateway) {
      const fallback = await this.adapters.get(config.fallbackGateway).initiate(request);
      if (fallback.isLive) return { ...fallback, method: config.displayName, wasFailover: true };
    }
    return { ...primary, method: config.displayName, wasFailover: false };
  }

  /** Admin: full routing table plus which gateways have credentials configured. */
  async routing() {
    const configs = await this.prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: "asc" } });
    const gateways = Object.values(PaymentGateway).map((gateway) => ({ gateway, ...this.adapters.get(gateway).status() }));
    return { configs, gateways, payfastPublic: await this.payfastIsPublic() };
  }

  async payfastIsPublic(): Promise<boolean> {
    const row = await this.prisma.siteContent.findUnique({ where: { key: PAYFAST_VISIBILITY_KEY } });
    return (row?.data as { public?: boolean } | null)?.public === true;
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
    const orderId = get("m_payment_id");
    const order = orderId ? await this.prisma.order.findUnique({ where: { id: orderId } }) : null;
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
    if (!order) return record("REJECTED", "No order with that reference.");
    if (!Number.isFinite(amount) || Math.abs(amount - Number(order.total)) > 0.01) return record("REJECTED", `Amount R${get("amount_gross")} doesn't match the order total R${Number(order.total).toFixed(2)}.`);
    if (!(await this.payfastConfirms(config, fields))) return record("REJECTED", "PayFast didn't confirm the notification as valid.");

    const status = get("payment_status");
    if (status !== "COMPLETE") return record("NOT_PAID", `Payment status ${status || "missing"} — the order stays awaiting payment.`);
    if (order.status !== "PENDING") {
      if (!order.paymentReference) await this.prisma.order.update({ where: { id: order.id }, data: { paymentReference: get("pf_payment_id") || null } });
      return record(
        "ALREADY_PAID",
        order.status === "CANCELLED" ? "The order had been cancelled — refund this payment from the PayFast dashboard." : `Order was already ${order.status}.`,
      );
    }
    await this.prisma.order.update({ where: { id: order.id }, data: { paymentReference: get("pf_payment_id") || null } });
    // The same path as staff confirming payment: paid date, invoice marked paid, customer notified.
    const confirm: UpdateOrderStatusDto = { status: "CONFIRMED" };
    await this.orders.updateStatus(order.id, confirm);
    this.logger.log(`PayFast payment ${get("pf_payment_id")} confirmed order ${order.orderNumber}.`);
    return record("PAID", null);
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
