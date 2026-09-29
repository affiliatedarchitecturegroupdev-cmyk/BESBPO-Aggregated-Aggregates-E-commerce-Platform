import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Carrier, NotificationEvent, OrderStatus, Prisma } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { ComplianceDocumentsService } from "../compliance-documents/compliance-documents.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../common/prisma.service";
import { CustomerTierName, PricingService, type PricingUnit } from "../pricing/pricing.service";
import { pricingUnit, unitOfSale } from "../pricing/units";
import { SuppliersService } from "../suppliers/suppliers.service";
import { CreateOrderDto, DeliveryDto, UpdateOrderStatusDto } from "./dto/create-order.dto";

type Line = { productId: string; sku: string; categorySlug: string; unit: PricingUnit; quantity: number };

/** Order status moves forward only (or to CANCELLED before delivery). */
const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_EVENT = {
  PENDING: "ORDER_PLACED",
  CONFIRMED: "ORDER_CONFIRMED",
  IN_TRANSIT: "ORDER_DISPATCHED",
  DELIVERED: "ORDER_DELIVERED",
  CANCELLED: "ORDER_CANCELLED",
} as const satisfies Record<OrderStatus, NotificationEvent>;

/**
 * Checkout orders. Everything is priced by the pricing service at the
 * buyer's own tier. Anything it marks quote-only — Volume/Civil Bulk orders
 * of 10m³ or more, delivery beyond 100km, out-of-range small or bagged
 * loads, packaged goods without a confirmed price — is refused here and
 * goes through the RFQ flow instead (AGENTIC_RULES.md rule 3).
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly documents: ComplianceDocumentsService,
    private readonly suppliers: SuppliersService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Prices a cart at the caller's tier without saving anything. */
  async priceCart(dto: { lines: { sku: string; unit: PricingUnit; quantity: number }[] } & DeliveryDto, user?: AuthUser) {
    const lines = await this.resolveLines({ lines: dto.lines });
    const delivery = await this.deliveryDistance(dto, lines);
    const priced = await this.pricingService.calculateOrder({
      lines: lines.map((l) => ({ sku: l.sku, unit: l.unit, quantity: l.quantity })),
      distanceKm: delivery.distanceKm,
      customerTier: await this.tierOf(user?.companyId ?? null),
    });
    return { ...priced, distance: delivery };
  }

  async createOrder(dto: CreateOrderDto, user: AuthUser) {
    const lines = await this.resolveLines(dto);
    const delivery = await this.deliveryDistance(dto, lines);
    // One call prices every line and the delivery for the combined load, so
    // the quote-only rules are decided once, by the pricing service.
    const priced = await this.pricingService.calculateOrder({
      lines: lines.map((l) => ({ sku: l.sku, unit: l.unit, quantity: l.quantity })),
      distanceKm: delivery.distanceKm,
      customerTier: await this.tierOf(user.companyId),
    });
    if (priced.is_quote_only || priced.total === null || priced.delivery.fee === null) {
      throw new BadRequestException(
        `This order is quote-only (${priced.reasons.join("; ")}) — route it to the RFQ flow (POST /quotes) instead of checkout.`,
      );
    }

    const order = await this.prisma.order.create({
      data: {
        orderNumber: `AA-${Date.now()}`,
        userId: user.id,
        companyId: user.companyId,
        status: OrderStatus.PENDING,
        subtotal: priced.subtotal,
        deliveryFee: priced.delivery.fee,
        total: priced.total,
        deliveryAddress: dto.deliveryAddress?.trim() || null,
        deliveryProvince: dto.deliveryProvince?.trim() || null,
        deliveryDistanceKm: delivery.distanceKm,
        distanceSource: delivery.source,
        contactPhone: dto.contactPhone?.trim() || null,
        whatsappUpdates: Boolean(dto.whatsappUpdates && dto.contactPhone?.trim()),
        notes: dto.notes?.trim() || null,
        lineItems: {
          create: lines.map((line, index) => ({
            productId: line.productId,
            unitOfSale: unitOfSale(line.unit),
            quantity: line.quantity,
            // A priced (non-quote-only) order has a price on every line.
            unitPrice: priced.lines[index].unit_price!,
            lineTotal: priced.lines[index].total!,
          })),
        },
      },
      include: { lineItems: { include: { product: true } } },
    });
    await this.notifications.order("ORDER_PLACED", order.id);
    return order;
  }

  /** The caller's own orders and their company's, newest first, with documents. */
  async listMine(user: AuthUser) {
    const orders = await this.prisma.order.findMany({
      where: { OR: [{ userId: user.id }, ...(user.companyId ? [{ companyId: user.companyId }] : [])] },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        lineItems: { include: { product: { select: { name: true, sku: true, slug: true } } } },
        shipment: true,
        invoice: { select: { id: true, invoiceNumber: true, status: true, amountDue: true, createdAt: true } },
      },
    });
    return this.documents.attachToOrders(orders);
  }

  async getOrder(id: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { lineItems: { include: { product: true } }, shipment: true, invoice: true },
    });
    const isOwner = order && (order.userId === user.id || (order.companyId !== null && order.companyId === user.companyId));
    if (!order || !(isOwner || STAFF_ROLES.includes(user.role))) {
      throw new NotFoundException(`Order not found: ${id}`);
    }
    const [withDocuments] = await this.documents.attachToOrders([order]);
    return withDocuments;
  }

  /** Staff: every order, newest first. */
  listAll(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        lineItems: { include: { product: { select: { name: true, sku: true } } } },
        shipment: true,
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        user: { select: { email: true, name: true } },
        company: { select: { name: true } },
      },
    });
  }

  /** Staff: confirm, dispatch (with carrier and tracking), deliver or cancel. */
  async updateStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { shipment: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status !== dto.status && !NEXT_STATUSES[order.status].includes(dto.status)) {
      throw new BadRequestException(`An order that is ${order.status} can't move to ${dto.status}.`);
    }
    if (dto.status === "IN_TRANSIT" && !dto.carrier && !order.shipment) {
      throw new BadRequestException("Say who is delivering (Besfleet or an external partner) when dispatching.");
    }
    if (dto.carrier === "EXTERNAL_PARTNER" && !dto.externalPartnerName?.trim() && !order.shipment?.externalPartnerName) {
      throw new BadRequestException("Name the external delivery partner.");
    }
    const now = new Date();
    const shipment =
      dto.carrier || dto.trackingRef || dto.status === "DELIVERED"
        ? {
            carrier: (dto.carrier ?? order.shipment?.carrier ?? "BESFLEET") as Carrier,
            externalPartnerName: dto.carrier === "BESFLEET" ? null : (dto.externalPartnerName?.trim() || order.shipment?.externalPartnerName || null),
            trackingRef: dto.trackingRef?.trim() || order.shipment?.trackingRef || null,
            distanceKm: order.deliveryDistanceKm,
            deliveryFeeApplied: order.deliveryFee,
            dispatchedAt: order.shipment?.dispatchedAt ?? (dto.status === "IN_TRANSIT" || dto.status === "DELIVERED" ? now : null),
            deliveredAt: dto.status === "DELIVERED" ? now : (order.shipment?.deliveredAt ?? null),
          }
        : null;
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        ...(shipment ? { shipment: { upsert: { create: shipment, update: shipment } } } : {}),
      },
      include: { shipment: true },
    });
    // An issued invoice follows the order: paid once payment is confirmed, void if cancelled.
    if (order.status !== dto.status && (dto.status === "CONFIRMED" || dto.status === "CANCELLED")) {
      await this.prisma.invoice.updateMany({
        where: { orderId: id, status: dto.status === "CONFIRMED" ? "UNPAID" : { not: "VOID" } },
        data: dto.status === "CONFIRMED" ? { status: "PAID", paidAt: now } : { status: "VOID" },
      });
    }
    // Only a real status change is news to the customer (tracking edits aren't).
    if (order.status !== dto.status) await this.notifications.order(STATUS_EVENT[dto.status], id);
    return updated;
  }

  private async resolveLines(dto: Pick<CreateOrderDto, "lines" | "lineItems">): Promise<Line[]> {
    const bySku = dto.lines !== undefined;
    const requested = bySku
      ? dto.lines!.map((l) => ({ key: l.sku, unit: l.unit, quantity: l.quantity }))
      : (dto.lineItems ?? []).map((l) => ({ key: l.productId, unit: pricingUnit(l.unitOfSale), quantity: l.quantity }));
    if (requested.length === 0) throw new BadRequestException("An order needs at least one line.");
    const products = await this.prisma.product.findMany({
      // Products staff have hidden from the storefront can't be ordered either.
      where: { ...(bySku ? { sku: { in: requested.map((r) => r.key) } } : { id: { in: requested.map((r) => r.key) } }), isActive: true },
      select: { id: true, sku: true, category: { select: { slug: true } } },
    });
    const byKey = new Map(products.map((p) => [bySku ? p.sku : p.id, p]));
    return requested.map((r) => {
      const product = byKey.get(r.key);
      if (!product) throw new NotFoundException(`Product not found: ${r.key}`);
      return { productId: product.id, sku: product.sku, categorySlug: product.category.slug, unit: r.unit, quantity: r.quantity };
    });
  }

  /**
   * The delivery distance: measured from the buyer's pin to the nearest
   * active partner supplier of each material (the farthest of those, since
   * the load comes from all of them), or the distance the buyer entered.
   * Straight-line — road distance is confirmed at dispatch.
   */
  private async deliveryDistance(dto: DeliveryDto, lines: Line[]) {
    if (dto.deliveryLatitude !== undefined && dto.deliveryLongitude !== undefined) {
      const categories = [...new Set(lines.map((l) => l.categorySlug))];
      const nearest = await Promise.all(categories.map((c) => this.suppliers.nearest(dto.deliveryLatitude!, dto.deliveryLongitude!, c)));
      const found = nearest.flatMap((n) => (n.found ? [n] : []));
      if (found.length === categories.length) {
        const farthest = found.reduce((a, b) => (b.distanceKm > a.distanceKm ? b : a));
        return { distanceKm: farthest.distanceKm, source: "LOCATION" as const, fromTown: farthest.town, fromProvince: farthest.province };
      }
      if (dto.deliveryDistanceKm === undefined) {
        throw new BadRequestException("We don't have a mapped supplier for every material in this order yet — enter the delivery distance instead.");
      }
    }
    if (dto.deliveryDistanceKm === undefined) throw new BadRequestException("Share your location or enter the delivery distance.");
    return { distanceKm: dto.deliveryDistanceKm, source: "CUSTOMER" as const, fromTown: null, fromProvince: null };
  }

  private async tierOf(companyId: string | null): Promise<CustomerTierName> {
    if (!companyId) return "RETAIL";
    // A pending or declined company's tier is Retail, so this is only ever a tier staff approved.
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, include: { tier: true } });
    return company?.tier.name ?? "RETAIL";
  }
}

export type OrderWithShipment = Prisma.OrderGetPayload<{ include: { shipment: true } }>;
