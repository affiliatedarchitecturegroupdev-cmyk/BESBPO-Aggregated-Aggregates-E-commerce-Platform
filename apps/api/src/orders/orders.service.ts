import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Carrier, NotificationEvent, OrderStatus, Prisma } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { ComplianceDocumentsService } from "../compliance-documents/compliance-documents.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../common/prisma.service";
import { CustomerTierName, PricingService, type PricingUnit } from "../pricing/pricing.service";
import { pricingUnit, unitOfSale } from "../pricing/units";
import { SuppliersService } from "../suppliers/suppliers.service";
import { PAYFAST_VISIBILITY_KEY } from "../payment-gateway/eligibility";
import { CreateOrderDto, DeliveryDto, ExpressDecisionDto, UpdateOrderStatusDto } from "./dto/create-order.dto";
import { EXPRESS, expressClock, expressOutcome, expressQuote, type ExpressQuote } from "./express";

type Line = { productId: string; sku: string; name: string; categorySlug: string; unit: PricingUnit; quantity: number };

/** An order with the AA 60/120 clock worked out (null for standard delivery). */
export function withExpress<T extends { status: string; expressFee: unknown; expressAcceptedAt: Date | null; expressDeclinedAt: Date | null; shipment?: { deliveredAt: Date | null } | null }>(
  order: T,
  now = new Date(),
) {
  const outcome = expressOutcome(order, order.shipment?.deliveredAt ?? null, now);
  const clock = order.expressAcceptedAt ? expressClock(order.expressAcceptedAt) : null;
  return {
    ...order,
    express: outcome
      ? {
          outcome,
          clockStartsAt: clock?.clockStartsAt ?? null,
          dueAt: clock?.dueAt ?? null,
          refundAfter: clock?.refundAfter ?? null,
          // A paid express fee is owed back if sales declined it or we were more than an hour late.
          feeRefundDue: (outcome === "DECLINED" || outcome === "REFUND_DUE") && Number(order.expressFee) > 0,
        }
      : null,
  };
}

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

  /** The time AA 60/120 rules are checked against (tests pin it to ordering hours). */
  clock: () => Date = () => new Date();

  /** Prices a cart at the caller's tier without saving anything. */
  async priceCart(dto: { lines: { sku: string; unit: PricingUnit; quantity: number }[] } & DeliveryDto, user?: AuthUser) {
    const lines = await this.resolveLines({ lines: dto.lines });
    const delivery = await this.deliveryDistance(dto, lines);
    const priced = await this.pricingService.calculateOrder({
      lines: lines.map((l) => ({ sku: l.sku, unit: l.unit, quantity: l.quantity })),
      distanceKm: delivery.distanceKm,
      customerTier: await this.tierOf(user?.companyId ?? null),
    });
    const express = await this.express(lines, priced, delivery, user);
    // The shopper sees prices only — never our cost, pricing family or benchmark research.
    const publicLines = priced.lines.map(({ sku, unit, quantity, equivalent_tons, equivalent_m3, list_unit_price, unit_price, total, unit_label, pricing_status }) => ({
      sku,
      unit,
      quantity,
      equivalent_tons,
      equivalent_m3,
      list_unit_price,
      unit_price,
      total,
      unit_label,
      pricing_status,
    }));
    return { ...priced, lines: publicLines, distance: delivery, express };
  }

  async createOrder(dto: CreateOrderDto, user: AuthUser) {
    const lines = await this.resolveLines(dto);
    const delivery = await this.deliveryDistance(dto, lines);
    // One call prices every line and the delivery for the combined load, so
    // the quote-only rules are decided once, by the pricing service.
    const customerTier = await this.tierOf(user.companyId);
    const priced = await this.pricingService.calculateOrder({
      lines: lines.map((l) => ({ sku: l.sku, unit: l.unit, quantity: l.quantity })),
      distanceKm: delivery.distanceKm,
      customerTier,
    });
    if (priced.is_quote_only || priced.total === null || priced.delivery.fee === null) {
      throw new BadRequestException(
        `This order is quote-only (${priced.reasons.join("; ")}) — route it to the RFQ flow (POST /quotes) instead of checkout.`,
      );
    }
    // AA 60/120 is re-checked here, never taken on the storefront's word.
    if (dto.express) {
      const express = await this.express(lines, priced, delivery, user);
      if (!express.available) throw new BadRequestException(`AA 60/120 isn't available for this order: ${express.reasons.join(" ")}`);
    }
    const expressFee = dto.express ? EXPRESS.feeRand : null;

    const order = await this.prisma.order.create({
      data: {
        orderNumber: `AA-${Date.now()}`,
        userId: user.id,
        companyId: user.companyId,
        status: OrderStatus.PENDING,
        subtotal: priced.subtotal,
        deliveryFee: priced.delivery.fee,
        total: priced.total + (expressFee ?? 0),
        expressFee,
        deliveryAddress: dto.deliveryAddress?.trim() || null,
        deliveryProvince: dto.deliveryProvince?.trim() || null,
        deliveryDistanceKm: delivery.distanceKm,
        distanceSource: delivery.source,
        contactPhone: dto.contactPhone?.trim() || null,
        whatsappUpdates: Boolean(dto.whatsappUpdates && dto.contactPhone?.trim()),
        notes: dto.notes?.trim() || null,
        // Reporting snapshot (ANALYTICS.md): the tier and load this order was priced at.
        customerTier,
        deliveryLoadSize: priced.delivery.load_size ?? null,
        // Orders placed from staff or admin accounts are tests by default (admins can unflag them).
        isTest: STAFF_ROLES.includes(user.role),
        lineItems: {
          create: lines.map((line, index) => {
            const p = priced.lines[index];
            return {
              productId: line.productId,
              unitOfSale: unitOfSale(line.unit),
              quantity: line.quantity,
              // A priced (non-quote-only) order has a price on every line.
              unitPrice: p.unit_price!,
              lineTotal: p.total!,
              // Cost snapshot for profit reporting — admin-only, never recalculated.
              listUnitPrice: p.list_unit_price,
              unitCost: p.unit_cost ?? null,
              pricingFamily: p.family ?? null,
              costSource: p.unit_cost != null ? ("SNAPSHOT" as const) : null,
            };
          }),
        },
      },
      include: { lineItems: { include: { product: true } } },
    });
    await this.notifications.order("ORDER_PLACED", order.id);
    return withExpress(order, this.clock());
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
    return (await this.documents.attachToOrders(orders)).map((o) => withExpress(o, this.clock()));
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
    return withExpress(withDocuments, this.clock());
  }

  /** Staff: every order, newest first — or AA 60/120 orders, the soonest due first. */
  async listAll(status?: OrderStatus, express = false) {
    const orders = await this.prisma.order.findMany({
      where: { ...(status ? { status } : {}), ...(express ? { expressFee: { not: null }, expressDeclinedAt: null } : {}) },
      orderBy: express ? [{ expressDueAt: { sort: "asc", nulls: "first" } }, { createdAt: "desc" }] : { createdAt: "desc" },
      take: 200,
      include: {
        lineItems: { include: { product: { select: { name: true, sku: true } } } },
        shipment: true,
        invoice: { select: { id: true, invoiceNumber: true, status: true } },
        user: { select: { email: true, name: true } },
        company: { select: { name: true } },
      },
    });
    return orders.map((o) => withExpress(o, this.clock()));
  }

  /**
   * Staff: confirm, dispatch (with carrier and tracking), deliver or cancel.
   * `fromPayment` is set when a payment in the ledger confirms the order (a
   * gateway, a deposit, a recorded EFT); a staff confirmation without one
   * records the outstanding amount as paid by EFT/purchase order, as before.
   */
  async updateStatus(id: string, dto: UpdateOrderStatusDto, opts: { fromPayment?: boolean; staffId?: string } = {}) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { shipment: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status !== dto.status && !NEXT_STATUSES[order.status].includes(dto.status)) {
      throw new BadRequestException(`An order that is ${order.status} can't move to ${dto.status}.`);
    }
    // Deposits (docs/payments.md): the balance is paid before the load leaves the supplier.
    const outstanding = Math.round((Number(order.total) - Number(order.amountPaid)) * 100) / 100;
    if ((dto.status === "IN_TRANSIT" || dto.status === "DELIVERED") && order.status !== dto.status && outstanding > 0.01) {
      throw new BadRequestException(`R${outstanding.toFixed(2)} is still to be paid on this order — take the balance (send a payment link or record the EFT) before dispatch.`);
    }
    if (dto.status === "CONFIRMED" && order.status === "PENDING" && !opts.fromPayment && outstanding > 0.01) {
      // Staff confirming payment by hand: the ledger records it as EFT / purchase order for the outstanding amount.
      await this.prisma.$transaction([
        this.prisma.payment.create({
          data: {
            orderId: id,
            kind: Number(order.amountPaid) > 0 ? "BALANCE" : "FULL",
            amount: outstanding,
            methodKey: dto.paymentMethod ?? order.paymentMethod ?? "EFT_PO",
            gateway: "MANUAL_EFT",
            status: "PAID",
            paidAt: new Date(),
            recordedById: opts.staffId ?? null,
          },
        }),
        this.prisma.order.update({ where: { id }, data: { amountPaid: order.total } }),
      ]);
    }
    if (dto.status === "IN_TRANSIT" && !dto.carrier && !order.shipment) {
      throw new BadRequestException("Say who is delivering (Besfleet or an external partner) when dispatching.");
    }
    if (dto.carrier === "EXTERNAL_PARTNER" && !dto.externalPartnerName?.trim() && !order.shipment?.externalPartnerName) {
      throw new BadRequestException("Name the external delivery partner.");
    }
    if (dto.fulfilledBySupplierId) {
      const supplier = await this.prisma.supplierLocation.findUnique({ where: { id: dto.fulfilledBySupplierId }, select: { id: true } });
      if (!supplier) throw new BadRequestException("That supplier wasn't found.");
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
    // What the delivery cost us: the actual amount staff enter, else the admin's standard rate (ANALYTICS.md).
    const cost = shipment ? await this.deliveryCost(order, (shipment.carrier as Carrier) ?? "BESFLEET", dto) : null;
    const shipmentData = shipment && cost ? { ...shipment, ...cost } : shipment;
    const statusChanged = order.status !== dto.status;
    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        // A sale counts from the moment payment is confirmed.
        ...(statusChanged && dto.status === "CONFIRMED" ? { paidAt: order.paidAt ?? now } : {}),
        ...(statusChanged && dto.status === "CANCELLED" ? { cancelledAt: now } : {}),
        ...(dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.fulfilledBySupplierId ? { fulfilledBySupplierId: dto.fulfilledBySupplierId } : {}),
        ...(shipmentData ? { shipment: { upsert: { create: shipmentData, update: shipmentData } } } : {}),
      },
      include: { shipment: true },
    });
    // An issued invoice follows the order: paid once the order is paid in full, void if cancelled.
    if (order.status !== dto.status && dto.status === "CANCELLED") {
      await this.prisma.invoice.updateMany({ where: { orderId: id, status: { not: "VOID" } }, data: { status: "VOID" } });
    }
    if (order.status !== dto.status && dto.status === "CONFIRMED") await this.settleInvoiceIfPaid(id);
    // Only a real status change is news to the customer (tracking edits aren't).
    if (order.status !== dto.status) await this.notifications.order(STATUS_EVENT[dto.status], id);
    // A paid AA 60/120 order: sales confirms a supplier by phone or email, then accepts it here.
    if (statusChanged && dto.status === "CONFIRMED" && order.expressFee !== null && !order.expressDeclinedAt) {
      await this.notifications.order("EXPRESS_PAID", id);
    }
    return withExpress(updated, this.clock());
  }

  /** Marks an issued invoice paid once the ledger covers the order total. */
  async settleInvoiceIfPaid(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { total: true, amountPaid: true } });
    if (order && Number(order.amountPaid) >= Number(order.total) - 0.01) {
      await this.prisma.invoice.updateMany({ where: { orderId, status: "UNPAID" }, data: { status: "PAID", paidAt: new Date() } });
    }
  }

  /**
   * Staff: AA 60/120. Accept once a supplier has confirmed it can load (the
   * 20-minute prep starts now, then the 120-minute clock), or decline: the
   * order goes by standard delivery and the express fee is refunded — or, if
   * it isn't paid yet, taken off the total.
   */
  async decideExpress(id: string, dto: ExpressDecisionDto) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { shipment: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.expressFee === null) throw new BadRequestException("This isn't an AA 60/120 order.");
    if (order.expressDeclinedAt) throw new BadRequestException("AA 60/120 was already declined for this order.");
    const now = this.clock();
    const note = dto.note?.trim() || null;
    if (dto.decision === "ACCEPT") {
      if (order.expressAcceptedAt) throw new BadRequestException("This order was already accepted for AA 60/120.");
      if (order.status !== "CONFIRMED") throw new BadRequestException("Accept AA 60/120 once payment is confirmed and before dispatch.");
      const updated = await this.prisma.order.update({
        where: { id },
        data: { expressAcceptedAt: now, expressDueAt: expressClock(now).dueAt, expressNote: note },
        include: { shipment: true },
      });
      await this.notifications.order("EXPRESS_ACCEPTED", id);
      return withExpress(updated, this.clock());
    }
    if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
      throw new BadRequestException("Only an order that hasn't been dispatched can be moved off AA 60/120.");
    }
    if (!note) throw new BadRequestException("Say why AA 60/120 can't be done — the customer sees it.");
    const unpaid = order.status === "PENDING";
    const updated = await this.prisma.$transaction(async (tx) => {
      const changed = await tx.order.update({
        where: { id },
        data: {
          expressDeclinedAt: now,
          expressNote: note,
          // Not paid yet: the fee simply comes off what's owed.
          ...(unpaid ? { expressFee: 0, total: { decrement: order.expressFee! } } : {}),
        },
        include: { shipment: true },
      });
      if (unpaid) await tx.invoice.updateMany({ where: { orderId: id, status: "UNPAID" }, data: { amountDue: changed.total } });
      return changed;
    });
    await this.notifications.order("EXPRESS_DECLINED", id);
    return withExpress(updated, this.clock());
  }

  /**
   * AA 60/120 for a cart: every line qualifies, priced, the pin within 30 km
   * of the nearest supplier of each material, one truck's load, ordering
   * hours — and online payment open to the customer (Card or PayFast only).
   */
  private async express(
    lines: Line[],
    priced: { is_quote_only: boolean; lines: { equivalent_tons?: number | null }[] },
    delivery: { distanceKm: number; source: "LOCATION" | "CUSTOMER" },
    user?: AuthUser,
  ): Promise<ExpressQuote> {
    const quote = expressQuote({
      lines: lines.map((l, i) => ({ ...l, equivalentTons: priced.lines[i]?.equivalent_tons ?? null })),
      distance: delivery,
      isQuoteOnly: priced.is_quote_only,
      now: this.clock(),
    });
    if (!(user && STAFF_ROLES.includes(user.role))) {
      const payfast = await this.prisma.siteContent.findUnique({ where: { key: PAYFAST_VISIBILITY_KEY } });
      if ((payfast?.data as { public?: boolean } | null)?.public === false) {
        return { ...quote, available: false, reasons: [...quote.reasons, "AA 60/120 is paid by card or PayFast, and online payment isn't open yet."] };
      }
    }
    return quote;
  }

  /**
   * The delivery's cost to us, ex VAT. Staff's actual figure wins; otherwise
   * the standard rate for the carrier, distance band and load. Ready-mix-only
   * orders travel in the plant's mixer (no separate delivery cost); steel,
   * masonry, roofing and building supplies go on the supplier's own vehicle, so the tipper rates don't apply and staff enter
   * the actual cost. No rate means no cost is recorded — it's never guessed.
   */
  private async deliveryCost(
    order: { id: string; deliveryDistanceKm: number | null; deliveryLoadSize: string | null; shipment: { deliveryCost: Prisma.Decimal | null; deliveryCostSource: string | null } | null },
    carrier: Carrier,
    dto: UpdateOrderStatusDto,
  ): Promise<{ deliveryCost: number | Prisma.Decimal | null; deliveryCostSource: "ACTUAL" | "STANDARD_RATE" | null; deliveryCostNote: string | null } | null> {
    if (dto.deliveryCost !== undefined) {
      return { deliveryCost: dto.deliveryCost, deliveryCostSource: "ACTUAL", deliveryCostNote: dto.deliveryCostNote?.trim() || null };
    }
    if (order.shipment?.deliveryCost != null) return null; // already recorded — keep it
    const lines = await this.prisma.orderLineItem.findMany({ where: { orderId: order.id }, select: { pricingFamily: true } });
    if (lines.length > 0 && lines.every((l) => l.pricingFamily === "READY_MIX" || l.pricingFamily === "STEEL" || l.pricingFamily === "MASONRY" || l.pricingFamily === "ROOFING" || l.pricingFamily === "SUPPLIES")) return null;
    if (order.deliveryDistanceKm === null) return null;
    const band = await this.prisma.deliveryBand.findFirst({
      where: { minKm: { lte: order.deliveryDistanceKm }, OR: [{ maxKm: null }, { maxKm: { gt: order.deliveryDistanceKm } }] },
      orderBy: { minKm: "desc" },
      select: { label: true },
    });
    if (!band) return null;
    const rate = await this.prisma.deliveryCostRate.findUnique({
      where: { carrier_bandLabel_load: { carrier, bandLabel: band.label, load: order.deliveryLoadSize ?? "BAGGED" } },
    });
    return rate ? { deliveryCost: rate.costExVat, deliveryCostSource: "STANDARD_RATE", deliveryCostNote: null } : null;
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
      select: { id: true, sku: true, name: true, category: { select: { slug: true } } },
    });
    const byKey = new Map(products.map((p) => [bySku ? p.sku : p.id, p]));
    return requested.map((r) => {
      const product = byKey.get(r.key);
      if (!product) throw new NotFoundException(`Product not found: ${r.key}`);
      return { productId: product.id, sku: product.sku, name: product.name, categorySlug: product.category.slug, unit: r.unit, quantity: r.quantity };
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
