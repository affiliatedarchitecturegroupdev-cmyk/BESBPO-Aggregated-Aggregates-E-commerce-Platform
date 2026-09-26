import { Injectable, NotFoundException } from "@nestjs/common";
import { QuoteStatus } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";

/**
 * RFQ / Civil Bulk Quote Flow (Module 3): a multi-step request — project
 * details, materials and quantities, delivery location, review — for orders
 * the pricing framework already treats as quote-only. This is the same
 * design answer Roofsteel gave to its cut/bend service selector: some
 * orders are too variable to price at checkout, so the platform collects
 * the right detail and routes it to a human quote instead of guessing.
 */
@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

  async createQuote(dto: CreateQuoteDto) {
    return this.prisma.quote.create({
      data: {
        companyId: dto.companyId,
        reasonCode: dto.reasonCode,
        deliveryDistanceKm: dto.deliveryDistanceKm,
        notes: dto.notes,
        status: QuoteStatus.SUBMITTED,
        lineItems: {
          create: dto.lineItems.map((item) => ({
            productId: item.productId,
            unitOfSale: item.unitOfSale,
            quantity: item.quantity,
          })),
        },
      },
      include: { lineItems: { include: { product: true } } },
    });
  }

  async getQuote(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { lineItems: { include: { product: true } }, company: true, user: true },
    });
    if (!quote) {
      throw new NotFoundException(`Quote not found: ${id}`);
    }
    return quote;
  }

  listQuotesForCompany(companyId: string) {
    return this.prisma.quote.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      include: { lineItems: true },
    });
  }
}
