import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PaymentGateway, PaymentMethodKey, Prisma } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import type { CustomerTierName } from "../pricing/pricing.service";
import { PaymentGatewayAdapterFactory } from "./adapters/adapter.factory";
import { eligiblePaymentMethods, isMethodEligible } from "./eligibility";
import { UpdatePaymentMethodDto } from "./payment-gateway.dto";

const PUBLIC_FIELDS = { methodKey: true, displayName: true, tradeOnly: true, minOrderValue: true, maxOrderValue: true, isEnabled: true, sortOrder: true } as const;

/**
 * Backend half of the payment architecture: every method is a standout tile
 * for the shopper, and this service alone knows whether a tile is eligible
 * for an order (re-checked server-side on every payment) and which gateway
 * processes it (PaymentMethodConfig, admin-editable for failover).
 */
@Injectable()
export class PaymentGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adapters: PaymentGatewayAdapterFactory,
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

    const webUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aggregates.store").replace(/\/+$/, "");
    const apiUrl = (process.env.NEXT_PUBLIC_APP_URL ?? webUrl).replace(/\/+$/, "");
    const request = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(order.total),
      methodKey,
      customerEmail: user.email,
      returnUrl: `${webUrl}/orders/${order.id}/confirmation`,
      notifyUrl: `${apiUrl}/api/v1/payment-methods/notify/${config.activeGateway.toLowerCase()}`,
    };
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
    return { configs, gateways };
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
