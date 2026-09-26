import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import { CreateOrderDto } from "./dto/create-order.dto";

/**
 * Confirmed checkout orders. Enforces the same server-side rule the pricing
 * microservice enforces: Volume/Civil Bulk tier orders (>=10m3 total) and
 * any delivery beyond 100km are quote-only and must not reach this endpoint
 * as a priced order — see AGENTIC_RULES.md rule 3.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  async createOrder(dto: CreateOrderDto) {
    const tierName = dto.companyId
      ? (await this.prisma.company.findUnique({ where: { id: dto.companyId }, include: { tier: true } }))?.tier.name
      : "RETAIL";

    let subtotal = 0;
    let totalM3 = 0;
    const pricedLineItems: {
      productId: string;
      unitOfSale: (typeof dto.lineItems)[number]["unitOfSale"];
      quantity: number;
      unitPrice: number;
      lineTotal: number;
    }[] = [];

    for (const item of dto.lineItems) {
      const priced = await this.pricingService.calculateTonnageVolume({
        sku: (await this.prisma.product.findUniqueOrThrow({ where: { id: item.productId } })).sku,
        quantity: item.quantity,
        unit: item.unitOfSale === "BULK_TON" ? "ton" : item.unitOfSale === "BULK_M3" ? "m3" : "bag",
        customerTier: (tierName as any) ?? "RETAIL",
      });

      if (priced.quote_only) {
        throw new BadRequestException(
          "This order includes a Volume/Civil Bulk tier quantity — route it to the RFQ flow (POST /quotes) instead of checkout.",
        );
      }

      subtotal += priced.total;
      totalM3 += priced.equivalent_m3;
      pricedLineItems.push({
        productId: item.productId,
        unitOfSale: item.unitOfSale,
        quantity: item.quantity,
        unitPrice: priced.unit_price,
        lineTotal: priced.total,
      });
    }

    const deliveryQuote = await this.pricingService.calculateDeliveryFee({
      distanceKm: dto.deliveryDistanceKm,
      quantityM3: totalM3,
    });

    if (deliveryQuote.is_quote_only) {
      throw new BadRequestException(
        `Delivery for this order is quote-only (${deliveryQuote.reason}) — route it to the RFQ flow instead of checkout.`,
      );
    }

    const deliveryFee = deliveryQuote.fee ?? 0;
    const total = subtotal + deliveryFee;

    return this.prisma.order.create({
      data: {
        orderNumber: `AA-${Date.now()}`,
        userId: dto.userId,
        companyId: dto.companyId,
        status: OrderStatus.PENDING,
        subtotal,
        deliveryFee,
        total,
        lineItems: { create: pricedLineItems },
      },
      include: { lineItems: { include: { product: true } } },
    });
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { lineItems: { include: { product: true } }, shipment: true, invoice: true },
    });
    if (!order) {
      throw new NotFoundException(`Order not found: ${id}`);
    }
    return order;
  }
}
