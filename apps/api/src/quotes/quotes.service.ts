import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, QuoteStatus } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CustomerTierName, PricingService } from "../pricing/pricing.service";
import { CreateQuoteDto, RespondToQuoteDto, UpdateQuoteDto } from "./dto/create-quote.dto";
import { quoteReasonCode, quoteReference } from "./quote-reason";

import { unitOfSale } from "../pricing/units";

const QUOTE_INCLUDE = {
  lineItems: { include: { product: { select: { name: true, sku: true, slug: true } } } },
  company: { select: { id: true, name: true } },
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.QuoteInclude;

/**
 * RFQ / Civil Bulk Quote Flow (Module 3): a multi-step request — project
 * details, materials and quantities, delivery location, review — for orders
 * the pricing framework treats as quote-only. Every request is priced by the
 * pricing service at the requester's tier so staff start from the platform's
 * own numbers, and the reason it needs a human quote is recorded.
 */
@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateQuoteDto, user?: AuthUser) {
    const company = user?.companyId
      ? await this.prisma.company.findUnique({ where: { id: user.companyId }, include: { tier: true } })
      : null;
    // A pending or declined company trades at Retail — its tierId already is Retail.
    const tier: CustomerTierName = company?.tier.name ?? "RETAIL";

    const products = await this.prisma.product.findMany({
      where: { sku: { in: dto.lines.map((l) => l.sku) }, isActive: true },
      select: { id: true, sku: true },
    });
    const productId = new Map(products.map((p) => [p.sku, p.id]));
    const unknown = dto.lines.find((l) => !productId.has(l.sku));
    if (unknown) throw new NotFoundException(`Unknown product: ${unknown.sku}`);

    const priced = await this.pricing.calculateOrder({
      lines: dto.lines,
      // Without a known distance, only the tier's volume rule can apply.
      distanceKm: dto.deliveryDistanceKm ?? 0,
      customerTier: tier,
    });

    const data = {
      userId: user?.id,
      companyId: company?.id,
      status: QuoteStatus.SUBMITTED,
      reasonCode: quoteReasonCode(priced.reason_codes),
      reasons: priced.reasons,
      contactName: dto.contactName.trim(),
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone?.trim() || null,
      whatsappUpdates: Boolean(dto.whatsappUpdates && dto.contactPhone?.trim()),
      companyName: dto.companyName?.trim() || company?.name || null,
      projectName: dto.projectName?.trim() || null,
      deliveryAddress: dto.deliveryAddress.trim(),
      deliveryProvince: dto.deliveryProvince?.trim() || null,
      deliveryDistanceKm: dto.deliveryDistanceKm ?? null,
      notes: dto.notes?.trim() || null,
      estimatedSubtotal: priced.subtotal,
      lineItems: {
        create: dto.lines.map((line, index) => ({
          productId: productId.get(line.sku)!,
          unitOfSale: unitOfSale(line.unit),
          quantity: line.quantity,
          estimatedUnitPrice: priced.lines[index].unit_price,
        })),
      },
    } satisfies Omit<Prisma.QuoteUncheckedCreateInput, "reference">;

    // References are short enough to read over the phone, so retry the rare collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const quote = await this.prisma.quote.create({ data: { ...data, reference: quoteReference() }, include: QUOTE_INCLUDE });
        await this.notifications.quote("QUOTE_RECEIVED", quote.id);
        return quote;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
      }
    }
    throw new ConflictException("Could not allocate a quote reference — please try again.");
  }

  listMine(user: AuthUser) {
    return this.prisma.quote.findMany({
      where: { OR: [{ userId: user.id }, ...(user.companyId ? [{ companyId: user.companyId }] : [])] },
      orderBy: { createdAt: "desc" },
      include: QUOTE_INCLUDE,
    });
  }

  listAll(status?: QuoteStatus) {
    return this.prisma.quote.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: QUOTE_INCLUDE,
    });
  }

  async get(id: string, user: AuthUser) {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: QUOTE_INCLUDE });
    if (!quote || !this.canSee(quote, user)) throw new NotFoundException("Quote not found.");
    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const quoted = dto.quotedTotal !== undefined;
    try {
      const quote = await this.prisma.quote.update({
        where: { id },
        data: {
          status: quoted ? QuoteStatus.QUOTED : dto.status,
          quotedTotal: dto.quotedTotal,
          quotedAt: quoted ? new Date() : undefined,
          staffNotes: dto.staffNotes,
        },
        include: QUOTE_INCLUDE,
      });
      if (quoted) await this.notifications.quote("QUOTE_PRICED", quote.id);
      return quote;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Quote not found.");
      }
      throw error;
    }
  }

  async respond(id: string, dto: RespondToQuoteDto, user: AuthUser) {
    const quote = await this.get(id, user);
    if (quote.status !== QuoteStatus.QUOTED) {
      throw new ConflictException("Only a quote with a price can be accepted or declined.");
    }
    if (!this.isOwner(quote, user)) throw new ForbiddenException("Only the requester can respond to this quote.");
    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: dto.decision === "ACCEPT" ? QuoteStatus.ACCEPTED : QuoteStatus.DECLINED, respondedAt: new Date() },
      include: QUOTE_INCLUDE,
    });
    await this.notifications.quote(dto.decision === "ACCEPT" ? "QUOTE_ACCEPTED" : "QUOTE_DECLINED", id);
    return updated;
  }

  private isOwner(quote: { userId: string | null; companyId: string | null }, user: AuthUser) {
    return quote.userId === user.id || (quote.companyId !== null && quote.companyId === user.companyId);
  }

  private canSee(quote: { userId: string | null; companyId: string | null }, user: AuthUser) {
    return STAFF_ROLES.includes(user.role) || this.isOwner(quote, user);
  }
}

