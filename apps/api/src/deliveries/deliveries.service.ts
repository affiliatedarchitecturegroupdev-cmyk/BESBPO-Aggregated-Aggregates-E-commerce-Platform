import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, type DeliveryDrop } from "@aggregates/database";
import { createHash, randomBytes } from "node:crypto";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { siteUrl } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { OrdersService } from "../orders/orders.service";
import { StorageService } from "../storage/storage.service";
import { linkedSupplierId, orderViewer } from "./access";
import type { CaptureProofDto, DeliveryPlanDto, UpdateDropDto } from "./deliveries.dto";
import { imageType, MAX_PHOTO_BYTES, MAX_SIGNATURE_BYTES } from "./images";
import { dropDispatchRefusal, parseDay, planDrops, saToday } from "./phasing";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
type DropLines = { lineItemId: string; quantity: number }[];

const ORDER_INCLUDE = {
  lineItems: { include: { product: { select: { name: true, sku: true } } } },
  drops: { orderBy: { sequence: "asc" }, include: { proof: true } },
  proofs: { orderBy: { capturedAt: "asc" } },
  shipment: true,
} satisfies Prisma.OrderInclude;
type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

type Upload = { buffer: Buffer; size: number; originalname?: string } | undefined;

/**
 * Phased deliveries and proof of delivery (docs/deliveries.md).
 *
 * A phased order is split into dated drops that between them deliver every
 * line exactly once. Each drop is confirmed with the supplier, dispatched
 * once payments cover it (or straight away on a trade account), and signed
 * for on site. The order is "out for delivery" from its first drop and
 * delivered when the last drop is.
 *
 * Proof of delivery: staff (or the fulfilling supplier) create a link for
 * the driver. The receiver signs on the driver's phone; a photo and the
 * phone's location are kept with the signature. A link works once.
 */
@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /** The order's delivery picture: single or phased, its drops and any proof of delivery. */
  async view(orderId: string, user: AuthUser) {
    const order = await this.load(orderId);
    const viewer = await orderViewer(this.prisma, order, user);
    if (!viewer) throw new NotFoundException("Order not found.");
    return this.present(order, viewer);
  }

  private present(order: LoadedOrder, viewer: "OWNER" | "STAFF" | "SUPPLIER") {
    const name = new Map(order.lineItems.map((l) => [l.id, { name: l.product.name, sku: l.product.sku, unitOfSale: l.unitOfSale, quantity: l.quantity }]));
    const proof = (p: LoadedOrder["proofs"][number] | null) =>
      p
        ? {
            id: p.id,
            receivedBy: p.receivedBy,
            capturedAt: p.capturedAt,
            capturedVia: p.capturedVia,
            exceptions: p.exceptions,
            hasSignature: Boolean(p.signatureKey),
            hasPhoto: Boolean(p.photoKey),
            // Where it was signed: for the buyer and staff checking a dispute.
            location: p.latitude !== null && p.longitude !== null ? { latitude: p.latitude, longitude: p.longitude } : null,
          }
        : null;
    const canEdit = this.planEditable(order) && viewer !== "SUPPLIER";
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      isPhased: order.isPhased,
      paymentPlan: order.paymentPlan,
      canPlan: canEdit,
      planBlockedReason: canEdit ? null : this.planBlockedReason(order),
      lines: order.lineItems.map((l) => ({ id: l.id, name: l.product.name, sku: l.product.sku, unitOfSale: l.unitOfSale, quantity: l.quantity, lineTotal: Number(l.lineTotal) })),
      drops: order.drops.map((d) => ({
        id: d.id,
        sequence: d.sequence,
        scheduledFor: d.scheduledFor.toISOString().slice(0, 10),
        status: d.status,
        value: Number(d.value),
        notes: d.notes,
        supplierReadyAt: d.supplierReadyAt,
        carrier: d.carrier,
        trackingRef: d.trackingRef,
        dispatchedAt: d.dispatchedAt,
        deliveredAt: d.deliveredAt,
        lines: (d.lines as DropLines).map((l) => ({ ...l, ...(name.get(l.lineItemId) ?? { name: "—", sku: "", unitOfSale: null }) })),
        proof: proof(d.proof),
        podLinkOpen: Boolean(d.podTokenHash),
      })),
      proof: order.isPhased ? null : proof(order.proofs.find((p) => p.dropId === null) ?? null),
      podLinkOpen: Boolean(order.podTokenHash),
    };
  }

  // -------------------------------------------------------------------------
  // The plan
  // -------------------------------------------------------------------------

  /** The buyer (before anything is dispatched) or staff: split the order into dated drops. Replaces any plan. */
  async setPlan(orderId: string, dto: DeliveryPlanDto, user: AuthUser) {
    const order = await this.load(orderId);
    const viewer = await orderViewer(this.prisma, order, user);
    if (!viewer || viewer === "SUPPLIER") throw new NotFoundException("Order not found.");
    if (!this.planEditable(order)) throw new BadRequestException(this.planBlockedReason(order));
    let drops;
    try {
      drops = planDrops(
        order.lineItems.map((l) => ({ id: l.id, name: l.product.name, quantity: l.quantity, lineTotal: Number(l.lineTotal) })),
        dto.drops,
        saToday(),
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    await this.prisma.$transaction([
      this.prisma.deliveryDrop.deleteMany({ where: { orderId } }),
      ...drops.map((d) =>
        this.prisma.deliveryDrop.create({
          data: { orderId, sequence: d.sequence, scheduledFor: d.scheduledFor, lines: d.lines as unknown as Prisma.InputJsonValue, value: d.value, notes: d.notes },
        }),
      ),
      this.prisma.order.update({ where: { id: orderId }, data: { isPhased: true, podTokenHash: null } }),
    ]);
    return this.present(await this.load(orderId), viewer);
  }

  /** Back to one delivery (nothing dispatched yet). */
  async clearPlan(orderId: string, user: AuthUser) {
    const order = await this.load(orderId);
    const viewer = await orderViewer(this.prisma, order, user);
    if (!viewer || viewer === "SUPPLIER") throw new NotFoundException("Order not found.");
    if (!order.isPhased) return this.present(order, viewer);
    if (!this.planEditable(order)) throw new BadRequestException(this.planBlockedReason(order));
    await this.prisma.$transaction([this.prisma.deliveryDrop.deleteMany({ where: { orderId } }), this.prisma.order.update({ where: { id: orderId }, data: { isPhased: false } })]);
    return this.present(await this.load(orderId), viewer);
  }

  private planEditable(order: LoadedOrder) {
    return (order.status === "PENDING" || order.status === "CONFIRMED") && !this.isExpress(order) && order.drops.every((d) => d.status === "PLANNED" || d.status === "CONFIRMED" || d.status === "CANCELLED");
  }

  private planBlockedReason(order: LoadedOrder) {
    if (this.isExpress(order)) return "AA 60/120 orders are one delivery.";
    if (order.status === "CANCELLED") return "This order was cancelled.";
    if (order.status === "DELIVERED") return "This order has been delivered.";
    if (order.status === "IN_TRANSIT" || order.drops.some((d) => d.status === "DISPATCHED" || d.status === "DELIVERED")) return "Deliveries have started — ask our team to change the remaining dates.";
    return "The delivery plan can't be changed now.";
  }

  private isExpress(order: { expressFee: Prisma.Decimal | null; expressDeclinedAt: Date | null }) {
    return order.expressFee !== null && Number(order.expressFee) > 0 && !order.expressDeclinedAt;
  }

  // -------------------------------------------------------------------------
  // Drops (staff; the supplier sets its ready date in the supplier portal)
  // -------------------------------------------------------------------------

  async updateDrop(dropId: string, dto: UpdateDropDto, staff: AuthUser) {
    if (!STAFF_ROLES.includes(staff.role)) throw new ForbiddenException();
    const drop = await this.prisma.deliveryDrop.findUnique({ where: { id: dropId } });
    if (!drop) throw new NotFoundException("Drop not found.");
    const order = await this.load(drop.orderId);
    if (order.status === "CANCELLED") throw new BadRequestException("This order was cancelled.");
    const data: Prisma.DeliveryDropUpdateInput = {};
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;
    if (dto.trackingRef !== undefined) data.trackingRef = dto.trackingRef.trim() || null;
    if (dto.scheduledFor) {
      if (drop.status !== "PLANNED" && drop.status !== "CONFIRMED") throw new BadRequestException("Only a drop that hasn't left can be rescheduled.");
      const day = parseDay(dto.scheduledFor);
      if (!day || dto.scheduledFor < saToday()) throw new BadRequestException("Choose today or a later date.");
      data.scheduledFor = day;
    }
    const now = new Date();
    if (dto.status && dto.status !== drop.status) {
      if (dto.status === "CONFIRMED") {
        if (drop.status !== "PLANNED") throw new BadRequestException("Only a planned drop can be confirmed.");
        if (order.status === "PENDING") throw new BadRequestException("Confirm drops once the order is confirmed (paid, deposit in, or on account).");
      } else if (dto.status === "DISPATCHED") {
        if (drop.status !== "PLANNED" && drop.status !== "CONFIRMED") throw new BadRequestException("This drop has already left.");
        if (order.status !== "CONFIRMED" && order.status !== "IN_TRANSIT") throw new BadRequestException("The order must be confirmed before a drop leaves.");
        if (!dto.carrier) throw new BadRequestException("Say who is delivering (Besfleet or an external partner).");
        if (dto.carrier === "EXTERNAL_PARTNER" && !dto.externalPartnerName?.trim()) throw new BadRequestException("Name the external delivery partner.");
        const refusal = dropDispatchRefusal(
          { total: Number(order.total), amountPaid: Number(order.amountPaid), paymentPlan: order.paymentPlan },
          order.drops.map((d) => ({ id: d.id, status: d.status, value: Number(d.value) })),
          drop.id,
        );
        if (refusal) throw new BadRequestException(refusal);
        data.carrier = dto.carrier;
        data.dispatchedAt = now;
      } else if (dto.status === "DELIVERED") {
        if (drop.status !== "DISPATCHED") throw new BadRequestException("Dispatch the drop before marking it delivered.");
        data.deliveredAt = now;
        data.podTokenHash = null;
      }
      data.status = dto.status;
    }
    await this.prisma.deliveryDrop.update({ where: { id: dropId }, data });
    if (dto.status === "DISPATCHED" && drop.status !== "DISPATCHED") {
      if (order.status === "CONFIRMED") {
        await this.orders.updateStatus(order.id, { status: "IN_TRANSIT", carrier: dto.carrier, externalPartnerName: dto.externalPartnerName, trackingRef: dto.trackingRef }, { fromDrops: true, staffId: staff.id });
      }
      await this.notifications.order("DROP_DISPATCHED", order.id, { dropId });
    }
    if (dto.status === "DELIVERED" && drop.status !== "DELIVERED") await this.afterDropDelivered(order.id);
    return this.present(await this.load(order.id), "STAFF");
  }

  /** The last drop delivered delivers the order. */
  private async afterDropDelivered(orderId: string) {
    const drops = await this.prisma.deliveryDrop.findMany({ where: { orderId, status: { not: "CANCELLED" } }, select: { status: true } });
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } });
    if (drops.length > 0 && drops.every((d) => d.status === "DELIVERED") && order.status === "IN_TRANSIT") {
      await this.orders.updateStatus(orderId, { status: "DELIVERED" }, { fromDrops: true });
    }
  }

  // -------------------------------------------------------------------------
  // Proof of delivery
  // -------------------------------------------------------------------------

  /** Staff or the fulfilling supplier: a link for the driver to capture the signature. Shown once; a new one replaces it. */
  async podLink(target: { orderId?: string; dropId?: string }, user: AuthUser) {
    let orderId = target.orderId;
    let drop: DeliveryDrop | null = null;
    if (target.dropId) {
      drop = await this.prisma.deliveryDrop.findUnique({ where: { id: target.dropId } });
      if (!drop) throw new NotFoundException("Drop not found.");
      orderId = drop.orderId;
    }
    const order = await this.load(orderId!);
    const viewer = await orderViewer(this.prisma, order, user);
    if (viewer !== "STAFF" && viewer !== "SUPPLIER") throw new NotFoundException("Order not found.");
    const token = randomBytes(24).toString("base64url");
    if (drop) {
      if (drop.status === "DELIVERED" || drop.status === "CANCELLED") throw new BadRequestException("This drop is already closed.");
      await this.prisma.deliveryDrop.update({ where: { id: drop.id }, data: { podTokenHash: hashToken(token) } });
    } else {
      if (order.isPhased) throw new BadRequestException("This order is delivered in drops — create the link for the drop.");
      if (order.status !== "CONFIRMED" && order.status !== "IN_TRANSIT") throw new BadRequestException("Create the link once the order is confirmed and before it's delivered.");
      await this.prisma.order.update({ where: { id: order.id }, data: { podTokenHash: hashToken(token) } });
    }
    return { url: `${siteUrl()}/pod/${token}` };
  }

  /** Public (the driver's phone): what's being delivered — no customer name, address or contact details. */
  async podView(token: string) {
    const { order, drop } = await this.byToken(token);
    const lines = drop
      ? (drop.lines as DropLines).map((l) => {
          const item = order.lineItems.find((i) => i.id === l.lineItemId);
          return { name: item?.product.name ?? "—", quantity: l.quantity, unitOfSale: item?.unitOfSale ?? null };
        })
      : order.lineItems.map((l) => ({ name: l.product.name, quantity: l.quantity, unitOfSale: l.unitOfSale }));
    const dispatched = drop ? drop.status === "DISPATCHED" : order.status === "IN_TRANSIT";
    return {
      orderNumber: order.orderNumber,
      drop: drop ? { sequence: drop.sequence, of: order.drops.filter((d) => d.status !== "CANCELLED").length, scheduledFor: drop.scheduledFor.toISOString().slice(0, 10) } : null,
      lines,
      ready: dispatched,
      note: dispatched ? null : "This delivery hasn't been marked as dispatched yet — ask our team to dispatch it, then capture the signature.",
    };
  }

  /** Public (the driver's phone): the receiver signs. Marks the delivery (or drop) delivered and closes the link. */
  async capture(token: string, dto: CaptureProofDto, files: { signature?: Upload; photo?: Upload }) {
    const { order, drop } = await this.byToken(token);
    const dispatched = drop ? drop.status === "DISPATCHED" : order.status === "IN_TRANSIT";
    if (!dispatched) throw new BadRequestException("This delivery hasn't been marked as dispatched yet — ask our team to dispatch it first.");
    const signature = files.signature;
    if (!signature?.buffer?.length) throw new BadRequestException("The receiver's signature is needed.");
    if (signature.size > MAX_SIGNATURE_BYTES) throw new BadRequestException("The signature image is too large.");
    const signatureType = imageType(signature.buffer);
    if (signatureType !== "image/png") throw new BadRequestException("The signature must be a PNG image.");
    const photo = files.photo?.buffer?.length ? files.photo : undefined;
    const photoType = photo ? imageType(photo.buffer) : null;
    if (photo && (!photoType || photo.size > MAX_PHOTO_BYTES)) throw new BadRequestException("The photo must be a JPEG, PNG or WebP image under 8 MB.");

    // Claim the link first so two submissions can't both record a delivery.
    const hash = hashToken(token);
    const claimed = drop
      ? await this.prisma.deliveryDrop.updateMany({ where: { id: drop.id, podTokenHash: hash }, data: { podTokenHash: null } })
      : await this.prisma.order.updateMany({ where: { id: order.id, podTokenHash: hash }, data: { podTokenHash: null } });
    if (claimed.count === 0) throw new BadRequestException("This link has already been used.");

    const proofId = randomBytes(12).toString("hex");
    const base = `proofs-of-delivery/${order.id}/${proofId}`;
    const signatureKey = `${base}-signature.png`;
    await this.storage.put(signatureKey, signature.buffer, "image/png");
    let photoKey: string | null = null;
    if (photo && photoType) {
      photoKey = `${base}-photo.${photoType === "image/jpeg" ? "jpg" : photoType.slice(6)}`;
      await this.storage.put(photoKey, photo.buffer, photoType);
    }
    const proof = await this.prisma.proofOfDelivery.create({
      data: {
        orderId: order.id,
        dropId: drop?.id ?? null,
        receivedBy: dto.receivedBy.trim(),
        exceptions: dto.exceptions?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        signatureKey,
        photoKey,
        capturedVia: "DRIVER_LINK",
      },
    });
    if (drop) {
      await this.prisma.deliveryDrop.update({ where: { id: drop.id }, data: { status: "DELIVERED", deliveredAt: proof.capturedAt } });
      await this.afterDropDelivered(order.id);
    } else {
      await this.orders.updateStatus(order.id, { status: "DELIVERED" });
    }
    await this.notifications.order("DELIVERY_SIGNED", order.id, { proofId: proof.id });
    return { recorded: true, receivedBy: proof.receivedBy, capturedAt: proof.capturedAt };
  }

  /** The signature or photo, for the buyer, staff or the fulfilling supplier. */
  async proofImage(proofId: string, kind: "signature" | "photo", user: AuthUser) {
    const proof = await this.prisma.proofOfDelivery.findUnique({ where: { id: proofId }, include: { order: { select: { userId: true, companyId: true, fulfilledBySupplierId: true } } } });
    if (!proof || !(await orderViewer(this.prisma, proof.order, user))) throw new NotFoundException("Not found.");
    const key = kind === "signature" ? proof.signatureKey : proof.photoKey;
    const object = key ? await this.storage.get(key) : null;
    if (!object) throw new NotFoundException("Not found.");
    return object;
  }

  // -------------------------------------------------------------------------
  // Staff and supplier lists
  // -------------------------------------------------------------------------

  /** Staff: drops due from today, soonest first (the delivery calendar). */
  async upcoming(days = 30) {
    const from = parseDay(saToday())!;
    const to = new Date(from.getTime() + days * 86_400_000);
    const drops = await this.prisma.deliveryDrop.findMany({
      where: { OR: [{ status: { in: ["PLANNED", "CONFIRMED"] }, scheduledFor: { lte: to } }, { status: "DISPATCHED" }] },
      orderBy: [{ scheduledFor: "asc" }, { sequence: "asc" }],
      take: 300,
      include: { order: { select: { id: true, orderNumber: true, status: true, deliveryProvince: true, paymentPlan: true, total: true, amountPaid: true, company: { select: { name: true } }, user: { select: { name: true } }, fulfilledBySupplier: { select: { name: true } } } } },
    });
    return drops.map((d) => ({
      id: d.id,
      sequence: d.sequence,
      scheduledFor: d.scheduledFor.toISOString().slice(0, 10),
      overdue: d.scheduledFor < from && d.status !== "DISPATCHED",
      status: d.status,
      value: Number(d.value),
      supplierReadyAt: d.supplierReadyAt,
      order: {
        id: d.order.id,
        orderNumber: d.order.orderNumber,
        status: d.order.status,
        province: d.order.deliveryProvince,
        paymentPlan: d.order.paymentPlan,
        balance: Math.max(0, Math.round((Number(d.order.total) - Number(d.order.amountPaid)) * 100) / 100),
        customer: d.order.company?.name ?? d.order.user?.name ?? null,
        supplier: d.order.fulfilledBySupplier?.name ?? null,
      },
    }));
  }

  /** The supplier portal: set the date a drop will be ready to load. */
  async supplierDropReady(dropId: string, readyAt: string, user: AuthUser) {
    const supplierId = await linkedSupplierId(this.prisma, user);
    const drop = await this.prisma.deliveryDrop.findUnique({ where: { id: dropId }, include: { order: { select: { fulfilledBySupplierId: true } } } });
    if (!supplierId || !drop || drop.order.fulfilledBySupplierId !== supplierId) throw new NotFoundException("Drop not found.");
    if (drop.status !== "PLANNED" && drop.status !== "CONFIRMED") throw new BadRequestException("This drop has already left.");
    const day = parseDay(readyAt);
    if (!day || readyAt < saToday()) throw new BadRequestException("Choose today or a later date.");
    await this.prisma.deliveryDrop.update({ where: { id: dropId }, data: { supplierReadyAt: day } });
    return { id: dropId, supplierReadyAt: day };
  }

  // -------------------------------------------------------------------------

  private async load(orderId: string): Promise<LoadedOrder> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException("Order not found.");
    return order;
  }

  private async byToken(token: string) {
    const hash = hashToken(token);
    const drop = await this.prisma.deliveryDrop.findUnique({ where: { podTokenHash: hash } });
    const orderId = drop?.orderId ?? (await this.prisma.order.findUnique({ where: { podTokenHash: hash }, select: { id: true } }))?.id;
    if (!orderId) throw new NotFoundException("This delivery link isn't valid or has been used. Ask our team for a new one.");
    const order = await this.load(orderId);
    if (order.status === "CANCELLED") throw new BadRequestException("This order was cancelled.");
    return { order, drop };
  }
}
