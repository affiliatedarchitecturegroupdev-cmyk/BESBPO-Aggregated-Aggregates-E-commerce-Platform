import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, UnitOfSale } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { ComplianceDocumentsService } from "../compliance-documents/compliance-documents.service";
import { PrismaService } from "../common/prisma.service";
import { CustomerTierName, PricingService, PricingUnit } from "../pricing/pricing.service";
import { CreateOrderDto } from "./dto/create-order.dto";

const UNIT_BY_UNIT_OF_SALE: Record<UnitOfSale, PricingUnit> = {
  BULK_TON: "ton",
  BULK_M3: "m3",
  BAGGED: "bag",
};

/**
 * Confirmed checkout orders. Anything the pricing service marks quote-only
 * — Volume/Civil Bulk tier orders of 10m3 or more, delivery beyond 100km,
 * small-load or bagged delivery beyond 30km — is refused here and must go
 * through the RFQ flow instead (AGENTIC_RULES.md rule 3).
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly documents: ComplianceDocumentsService,
  ) {}

  async createOrder(dto: CreateOrderDto, user: AuthUser) {
    // A pending or declined company's tier is Retail, so this is only ever a tier staff approved.
    const tierName: CustomerTierName = user.companyId
      ? ((await this.prisma.company.findUnique({ where: { id: user.companyId }, include: { tier: true } }))?.tier
          .name ?? "RETAIL")
      : "RETAIL";

    const products = await this.prisma.product.findMany({
      // Products staff have hidden from the storefront can't be ordered either.
      where: { id: { in: dto.lineItems.map((item) => item.productId) }, isActive: true },
      select: { id: true, sku: true },
    });
    const skuById = new Map(products.map((p) => [p.id, p.sku]));
    for (const item of dto.lineItems) {
      if (!skuById.has(item.productId)) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }
    }

    // One call prices every line and the delivery for the combined load, so
    // the quote-only rules are decided once, by the pricing service.
    const priced = await this.pricingService.calculateOrder({
      lines: dto.lineItems.map((item) => ({
        sku: skuById.get(item.productId)!,
        quantity: item.quantity,
        unit: UNIT_BY_UNIT_OF_SALE[item.unitOfSale],
      })),
      distanceKm: dto.deliveryDistanceKm,
      customerTier: tierName,
    });

    if (priced.is_quote_only || priced.total === null || priced.delivery.fee === null) {
      throw new BadRequestException(
        `This order is quote-only (${priced.reasons.join("; ")}) — route it to the RFQ flow (POST /quotes) instead of checkout.`,
      );
    }

    return this.prisma.order.create({
      data: {
        orderNumber: `AA-${Date.now()}`,
        userId: user.id,
        companyId: user.companyId,
        status: OrderStatus.PENDING,
        subtotal: priced.subtotal,
        deliveryFee: priced.delivery.fee,
        total: priced.total,
        lineItems: {
          create: dto.lineItems.map((item, index) => ({
            productId: item.productId,
            unitOfSale: item.unitOfSale,
            quantity: item.quantity,
            unitPrice: priced.lines[index].unit_price,
            lineTotal: priced.lines[index].total,
          })),
        },
      },
      include: { lineItems: { include: { product: true } } },
    });
  }

  /** The caller's own orders and their company's, newest first, with documents. */
  async listMine(user: AuthUser) {
    const orders = await this.prisma.order.findMany({
      where: { OR: [{ userId: user.id }, ...(user.companyId ? [{ companyId: user.companyId }] : [])] },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { lineItems: { include: { product: { select: { name: true, sku: true } } } }, shipment: true },
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
}
