import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { email, siteUrl } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { linkedSupplierId } from "./access";
import { parseDay, saToday } from "./phasing";

const PORTAL_ORDER_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  createdAt: true,
  paidAt: true,
  deliveryAddress: true,
  deliveryProvince: true,
  notes: true,
  isPhased: true,
  supplierAckAt: true,
  supplierReadyAt: true,
  supplierDeclinedAt: true,
  supplierNote: true,
  podTokenHash: true,
  lineItems: { select: { id: true, quantity: true, unitOfSale: true, product: { select: { name: true, sku: true } } } },
  drops: { orderBy: { sequence: "asc" }, select: { id: true, sequence: true, scheduledFor: true, status: true, lines: true, supplierReadyAt: true, dispatchedAt: true, deliveredAt: true } },
  shipment: { select: { carrier: true, dispatchedAt: true, deliveredAt: true } },
  proofs: { select: { id: true, dropId: true, receivedBy: true, capturedAt: true, exceptions: true } },
} satisfies Prisma.OrderSelect;

/**
 * The supplier portal (docs/supplier-portal.md). Staff link a partner
 * supplier's staff logins to the supplier, and assign orders to it. The
 * supplier sees the orders it's loading — what, how much, when and where —
 * and answers: it can load (and when), or it can't. It never sees what the
 * customer paid, who they are or how to contact them; questions go through
 * our team.
 */
@Injectable()
export class SupplierPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- staff -----------------------------------------------------------------

  async logins(supplierId: string) {
    await this.supplier(supplierId);
    return this.prisma.user.findMany({ where: { supplierLocationId: supplierId }, select: { id: true, email: true, name: true }, orderBy: { createdAt: "asc" } });
  }

  async linkUser(supplierId: string, rawEmail: string) {
    await this.supplier(supplierId);
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, role: true, supplierLocationId: true, companyId: true } });
    if (!user) throw new NotFoundException("No account uses that email. Ask the supplier to create one on the site first.");
    if (user.role !== "CUSTOMER" && user.role !== "SUPPLIER") throw new BadRequestException("Staff, admin, partner and trade-company accounts can't be supplier logins — use a separate account.");
    if (user.companyId) throw new BadRequestException("That account belongs to a trade company — use a separate account for the supplier.");
    if (user.supplierLocationId && user.supplierLocationId !== supplierId) throw new BadRequestException("That account is already linked to another supplier.");
    await this.prisma.user.update({ where: { id: user.id }, data: { role: "SUPPLIER", supplierLocationId: supplierId } });
    return this.logins(supplierId);
  }

  async unlinkUser(supplierId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { supplierLocationId: true } });
    if (!user || user.supplierLocationId !== supplierId) throw new NotFoundException("That login isn't linked to this supplier.");
    await this.prisma.user.update({ where: { id: userId }, data: { role: "CUSTOMER", supplierLocationId: null } });
    return this.logins(supplierId);
  }

  /** Staff: give an order to a supplier to load. Emails the supplier's portal logins. */
  async assign(orderId: string, supplierId: string, notify: boolean) {
    const supplier = await this.supplier(supplierId);
    if (!supplier.isActive) throw new BadRequestException("That supplier isn't active.");
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true, fulfilledBySupplierId: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status === "CANCELLED" || order.status === "DELIVERED") throw new BadRequestException("This order is closed.");
    const changed = order.fulfilledBySupplierId !== supplierId;
    await this.prisma.order.update({
      where: { id: orderId },
      data: { fulfilledBySupplierId: supplierId, ...(changed ? { supplierAckAt: null, supplierReadyAt: null, supplierDeclinedAt: null, supplierNote: null } : {}) },
    });
    if (notify) await this.notifications.order("SUPPLIER_ORDER", orderId);
    const logins = await this.prisma.user.count({ where: { supplierLocationId: supplierId } });
    return { assigned: true, supplier: supplier.name, portalLogins: logins, emailed: notify && logins > 0 };
  }

  // --- the supplier ------------------------------------------------------------

  async me(user: AuthUser) {
    const supplierId = await this.require(user);
    const supplier = await this.prisma.supplierLocation.findUniqueOrThrow({ where: { id: supplierId }, select: { id: true, name: true, city: true, province: true, categorySlugs: true } });
    const counts = await this.prisma.order.groupBy({ by: ["status"], where: { fulfilledBySupplierId: supplierId }, _count: true });
    return { supplier, counts: Object.fromEntries(counts.map((c) => [c.status, c._count])) };
  }

  async orders(user: AuthUser, scope: "open" | "done" = "open") {
    const supplierId = await this.require(user);
    const orders = await this.prisma.order.findMany({
      where: { fulfilledBySupplierId: supplierId, status: scope === "open" ? { in: ["PENDING", "CONFIRMED", "IN_TRANSIT"] } : { in: ["DELIVERED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: PORTAL_ORDER_SELECT,
    });
    return orders.map((o) => this.present(o));
  }

  async order(orderId: string, user: AuthUser) {
    const supplierId = await this.require(user);
    const order = await this.prisma.order.findFirst({ where: { id: orderId, fulfilledBySupplierId: supplierId }, select: PORTAL_ORDER_SELECT });
    if (!order) throw new NotFoundException("Order not found.");
    return this.present(order);
  }

  /** The supplier's answer: it can load the order (and from when), or it can't. */
  async respond(orderId: string, dto: { decision: "ACCEPT" | "DECLINE"; readyAt?: string; note?: string }, user: AuthUser) {
    const supplierId = await this.require(user);
    const order = await this.prisma.order.findFirst({ where: { id: orderId, fulfilledBySupplierId: supplierId }, select: { id: true, orderNumber: true, status: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (!["PENDING", "CONFIRMED"].includes(order.status)) throw new BadRequestException("This order has already left or is closed.");
    const note = dto.note?.trim() || null;
    const supplier = await this.prisma.supplierLocation.findUniqueOrThrow({ where: { id: supplierId }, select: { name: true } });
    if (dto.decision === "ACCEPT") {
      const ready = dto.readyAt ? parseDay(dto.readyAt) : null;
      if (dto.readyAt && (!ready || dto.readyAt < saToday())) throw new BadRequestException("Choose today or a later date.");
      await this.prisma.order.update({ where: { id: orderId }, data: { supplierAckAt: new Date(), supplierReadyAt: ready, supplierDeclinedAt: null, supplierNote: note } });
    } else {
      if (!note) throw new BadRequestException("Say why you can't load it, so our team can find another supplier.");
      await this.prisma.order.update({ where: { id: orderId }, data: { supplierDeclinedAt: new Date(), supplierAckAt: null, supplierReadyAt: null, supplierNote: note } });
    }
    const verdict = dto.decision === "ACCEPT" ? `can load it${dto.readyAt ? ` from ${dto.readyAt}` : ""}` : "can't load it";
    await this.notifications.staffAlert(
      "SUPPLIER_ORDER",
      email(`Supplier ${dto.decision === "ACCEPT" ? "accepted" : "DECLINED"} — ${order.orderNumber}`, [
        { kind: "p", text: `${supplier.name} says it ${verdict}.${note ? ` Note: ${note}` : ""}` },
        ...(dto.decision === "DECLINE" ? [{ kind: "p" as const, text: "Assign the order to another supplier in admin." }] : []),
        { kind: "cta", label: "Open the order", href: `${siteUrl()}/admin/orders/${order.id}/deliveries` },
      ]),
    );
    return this.order(orderId, user);
  }

  private present(o: Prisma.OrderGetPayload<{ select: typeof PORTAL_ORDER_SELECT }>) {
    const names = new Map(o.lineItems.map((l) => [l.id, l]));
    const { podTokenHash: _hash, ...rest } = o;
    return {
      ...rest,
      lineItems: o.lineItems.map((l) => ({ id: l.id, name: l.product.name, sku: l.product.sku, quantity: l.quantity, unitOfSale: l.unitOfSale })),
      drops: o.drops.map((d) => ({
        ...d,
        scheduledFor: d.scheduledFor.toISOString().slice(0, 10),
        lines: (d.lines as { lineItemId: string; quantity: number }[]).map((l) => ({ ...l, name: names.get(l.lineItemId)?.product.name ?? "—", unitOfSale: names.get(l.lineItemId)?.unitOfSale ?? null })),
      })),
      // Ready to load once the order is confirmed (paid, deposit in, or on account).
      canLoad: o.status === "CONFIRMED" || o.status === "IN_TRANSIT",
    };
  }

  private async require(user: AuthUser) {
    const id = await linkedSupplierId(this.prisma, user);
    if (!id) throw new ForbiddenException("This login isn't linked to an active supplier.");
    return id;
  }

  private async supplier(id: string) {
    const supplier = await this.prisma.supplierLocation.findUnique({ where: { id }, select: { id: true, name: true, isActive: true } });
    if (!supplier) throw new NotFoundException("Supplier not found.");
    return supplier;
  }
}
