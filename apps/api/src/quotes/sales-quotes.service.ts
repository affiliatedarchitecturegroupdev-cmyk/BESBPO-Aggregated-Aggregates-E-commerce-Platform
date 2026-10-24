import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, QuoteStatus } from "@aggregates/database";
import { createHash, randomBytes } from "crypto";
import type { AuthUser } from "../common/auth/auth-user";
import { formatDateZA, formatZAR, SELLER, UNIT_LABEL } from "../common/format";
import { PrismaService } from "../common/prisma.service";
import { QUOTATION_INCLUDE, quotationPdf } from "../documents/quotation";
import { siteUrl, whatsappNumber } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { DdpService } from "../orders/ddp.service";
import { PaymentsService } from "../payment-gateway/payments.service";
import { PricingService, type CustomerTierName, type PricingUnit } from "../pricing/pricing.service";
import { pricingUnit, unitOfSale } from "../pricing/units";
import type { SalesQuotePriceDto, SaveSalesQuoteDto } from "./dto/sales-quote.dto";
import { DEFAULT_VALID_DAYS, priceQuoteLine, quotationNumber, quoteTotals, round2, type PriceSource } from "./sales-quote";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
/** How long the client's payment link stays open after they accept. */
const PAY_LINK_DAYS = 7;

const STAFF_INCLUDE = {
  ...QUOTATION_INCLUDE,
  lineItems: { orderBy: { sortOrder: "asc" }, include: { product: { select: { name: true, sku: true, slug: true, unitsOfSale: true } } } },
  order: { select: { id: true, orderNumber: true, status: true, total: true, amountPaid: true } },
} satisfies Prisma.QuoteInclude;
type StaffQuote = Prisma.QuoteGetPayload<{ include: typeof STAFF_INCLUDE }>;

/**
 * Sales quotations (docs/sales-quotes.md): formal quotes staff make in the
 * admin panel for clients who come in by WhatsApp, social media or phone.
 * Any product can be quoted — at its list price, at a supplier's cost plus a
 * markup, or at a price staff type in. A quotation is issued with a number
 * (AAQ-000001) and a private link where the client views it, downloads the
 * PDF, and accepts and pays (which makes the order and its payment link).
 */
@Injectable()
export class SalesQuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly ddp: DdpService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Staff: products to quote, by name or SKU — every product, including ones without a list price. */
  async searchProducts(q: string) {
    const term = q.trim();
    if (term.length < 2) return [];
    const products = await this.prisma.product.findMany({
      where: { OR: [{ name: { contains: term, mode: "insensitive" } }, { sku: { contains: term, mode: "insensitive" } }] },
      select: { sku: true, name: true, unitsOfSale: true, isActive: true, category: { select: { name: true } } },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 25,
    });
    return products.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category.name,
      isActive: p.isActive,
      units: p.unitsOfSale.map((u) => ({ unit: pricingUnit(u), label: UNIT_LABEL[u] })),
    }));
  }

  /**
   * Prices a quotation without saving it: each line's list price, standard
   * markup and quoted price, the suggested delivery (the standard delivery
   * rules plus any distributed delivery premium) and the totals with margin.
   */
  async price(dto: SalesQuotePriceDto & { deliveryFee?: number | null; client?: { province?: string } }) {
    const tier: CustomerTierName = dto.tier ?? "RETAIL";
    const skus = [...new Set(dto.lines.map((l) => l.sku))];
    const products = await this.prisma.product.findMany({ where: { sku: { in: skus } }, select: { id: true, sku: true, name: true, unitsOfSale: true, category: { select: { slug: true } } } });
    const bySku = new Map(products.map((p) => [p.sku, p]));
    for (const line of dto.lines) {
      const product = bySku.get(line.sku);
      if (!product) throw new NotFoundException(`No product with SKU ${line.sku}.`);
      if (!product.unitsOfSale.includes(unitOfSale(line.unit))) throw new BadRequestException(`${product.name} isn't sold by ${line.unit}.`);
    }
    const distanceKm = dto.deliveryDistanceKm ?? null;
    const priced = await this.pricing
      .calculateOrder({ lines: dto.lines.map((l) => ({ sku: l.sku, unit: l.unit, quantity: l.quantity })), distanceKm: distanceKm ?? 0, customerTier: tier })
      .catch((error: Error) => {
        throw new BadRequestException(`The pricing service couldn't price these lines: ${error.message}`);
      });

    const lines = dto.lines.map((line, i) => {
      const product = bySku.get(line.sku)!;
      const p = priced.lines[i];
      const ref = { listUnitPrice: p?.unit_price ?? null, listUnitCost: p?.unit_cost ?? null, standardMarkupPercent: p?.markup_percent ?? null };
      const quote = priceQuoteLine(line, ref);
      return {
        productId: product.id,
        categorySlug: product.category.slug,
        sku: product.sku,
        name: product.name,
        unit: line.unit,
        unitLabel: UNIT_LABEL[unitOfSale(line.unit)],
        quantity: line.quantity,
        note: line.note?.trim() || null,
        listUnitPrice: ref.listUnitPrice,
        standardMarkupPercent: ref.standardMarkupPercent,
        tons: p?.equivalent_tons ?? 0,
        unitPrice: quote?.unitPrice ?? null,
        unitCost: quote?.unitCost ?? null,
        markupPercent: quote?.markupPercent ?? null,
        priceSource: (quote?.priceSource ?? null) as PriceSource | null,
        lineTotal: quote ? round2(quote.unitPrice * line.quantity) : null,
      };
    });

    // Suggested delivery: the standard rules for the load and distance, plus the delivery premium for extra supply points.
    let suggestedDelivery: { standard: number | null; premium: number; total: number | null; note: string } | null = null;
    if (distanceKm !== null) {
      const premium = await this.ddp.assess(lines, lines.map((l) => l.tons), { province: dto.province || dto.client?.province || null });
      const standard = priced.delivery.fee;
      suggestedDelivery = {
        standard,
        premium: premium.fee,
        total: standard === null ? null : round2(standard + premium.fee),
        note:
          standard === null
            ? `The standard delivery rules don't price this load (${priced.delivery.reasons.join("; ") || "outside the delivery bands"}) — enter the delivery fee.`
            : premium.applies
              ? `Standard delivery ${formatZAR(standard)} plus a ${formatZAR(premium.fee)} distributed delivery premium (${premium.origins.length} supply points).`
              : `Standard delivery for ${distanceKm} km.`,
      };
    }
    const deliveryFee = dto.deliveryFee ?? suggestedDelivery?.total ?? null;
    const missing = lines.filter((l) => l.unitPrice === null).map((l) => l.name);
    const totals =
      missing.length === 0 && deliveryFee !== null
        ? quoteTotals(lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice!, unitCost: l.unitCost })), deliveryFee)
        : null;
    return { tier, lines, suggestedDelivery, deliveryFee, missingPrices: missing, totals };
  }

  async create(dto: SaveSalesQuoteDto, staff: AuthUser) {
    const data = await this.quoteData(dto);
    const quote = await this.prisma.quote.create({
      data: { ...data.quote, channel: "SALES", status: QuoteStatus.DRAFT, reasonCode: "SALES_QUOTE", reasons: [], createdById: staff.id, lineItems: { create: data.lines } },
      select: { id: true },
    });
    return this.get(quote.id);
  }

  /** Editing an issued quotation takes it back to draft: the client's link stops working until it's issued again. */
  async update(id: string, dto: SaveSalesQuoteDto) {
    const existing = await this.load(id);
    if (existing.order) throw new ConflictException(`Order ${existing.order.orderNumber} was made from this quotation — it can't be changed now. Duplicate it instead.`);
    if (existing.status === QuoteStatus.ACCEPTED || existing.status === QuoteStatus.DECLINED) throw new BadRequestException("This quotation has been answered — duplicate it to quote again.");
    const data = await this.quoteData(dto);
    await this.prisma.$transaction([
      this.prisma.quoteLineItem.deleteMany({ where: { quoteId: id } }),
      this.prisma.quote.update({ where: { id }, data: { ...data.quote, status: QuoteStatus.DRAFT, acceptTokenHash: null, lineItems: { create: data.lines } } }),
    ]);
    return this.get(id);
  }

  async duplicate(id: string, staff: AuthUser) {
    const q = await this.load(id);
    const copy = await this.prisma.quote.create({
      data: {
        channel: "SALES",
        status: QuoteStatus.DRAFT,
        reasonCode: "SALES_QUOTE",
        reasons: [],
        createdById: staff.id,
        contactName: q.contactName,
        contactEmail: q.contactEmail,
        contactPhone: q.contactPhone,
        companyName: q.companyName,
        clientVatNumber: q.clientVatNumber,
        deliveryAddress: q.deliveryAddress,
        deliveryProvince: q.deliveryProvince,
        deliveryDistanceKm: q.deliveryDistanceKm,
        pricingTier: q.pricingTier,
        deliveryFee: q.deliveryFee,
        notes: q.notes,
        staffNotes: q.staffNotes,
        estimatedSubtotal: q.estimatedSubtotal,
        quotedTotal: q.quotedTotal,
        validUntil: new Date(Date.now() + DEFAULT_VALID_DAYS * 86_400_000),
        lineItems: {
          create: q.lineItems.map((l) => ({
            productId: l.productId,
            unitOfSale: l.unitOfSale,
            quantity: l.quantity,
            estimatedUnitPrice: l.estimatedUnitPrice,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            markupPercent: l.markupPercent,
            priceSource: l.priceSource,
            note: l.note,
            sortOrder: l.sortOrder,
          })),
        },
      },
      select: { id: true },
    });
    return this.get(copy.id);
  }

  /**
   * Issues the quotation: gives it its number (the first time), makes a fresh
   * private link for the client (any earlier link stops working) and, if
   * asked, emails it with the PDF attached. The link is returned once — for
   * WhatsApp or copying — and only its hash is kept.
   */
  async issue(id: string, opts: { email?: boolean }) {
    const q = await this.load(id);
    if (q.order) throw new ConflictException(`Order ${q.order.orderNumber} was already made from this quotation.`);
    if (q.status !== QuoteStatus.DRAFT && q.status !== QuoteStatus.QUOTED) throw new BadRequestException("Only a draft or an open quotation can be sent.");
    if (q.validUntil && q.validUntil.getTime() < Date.now()) throw new BadRequestException("This quotation has expired — save it again to set a new validity date.");
    if (opts.email && !q.contactEmail) throw new BadRequestException("Add the client's email address to email the quotation.");
    let number = q.quoteNumber;
    if (!number) {
      const [{ nextval }] = await this.prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('quote_number_seq')`;
      number = quotationNumber(nextval);
    }
    const token = randomBytes(24).toString("base64url");
    const now = new Date();
    await this.prisma.quote.update({
      where: { id },
      data: { quoteNumber: number, status: QuoteStatus.QUOTED, quotedAt: q.quotedAt ?? now, acceptTokenHash: hashToken(token), ...(opts.email ? { sentAt: now } : {}) },
    });
    const url = `${siteUrl()}/quotation/${token}`;
    const total = Number(q.quotedTotal ?? 0);
    if (opts.email) {
      await this.notifications.quotation(id, q.contactEmail!, {
        quoteNumber: number,
        contactName: q.contactName,
        total,
        validUntil: q.validUntil,
        lines: q.lineItems.map((l) => ({ name: l.product.name, quantity: l.quantity, unitOfSale: l.unitOfSale })),
        url,
        preparedBy: q.createdBy?.name ?? null,
        message: q.notes,
      });
    }
    const phone = whatsappNumber(q.contactPhone);
    const text = `Hi ${q.contactName?.split(" ")[0] ?? "there"}, here is your quotation ${number} from ${SELLER.tradingName}: ${formatZAR(total)} delivered${
      q.validUntil ? `, valid until ${formatDateZA(q.validUntil)}` : ""
    }. View it, download the PDF, and accept and pay online here: ${url}`;
    return {
      quoteNumber: number,
      url,
      emailedTo: opts.email ? q.contactEmail : null,
      whatsappUrl: `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`,
      whatsappText: text,
    };
  }

  /** Staff: sales quotations, newest first. */
  async list(status?: QuoteStatus) {
    await this.expireOverdue();
    const quotes = await this.prisma.quote.findMany({
      where: { channel: "SALES", ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        quoteNumber: true,
        status: true,
        contactName: true,
        companyName: true,
        contactEmail: true,
        contactPhone: true,
        quotedTotal: true,
        validUntil: true,
        createdAt: true,
        quotedAt: true,
        sentAt: true,
        createdBy: { select: { name: true } },
        order: { select: { id: true, orderNumber: true, status: true } },
        _count: { select: { lineItems: true } },
      },
    });
    return quotes;
  }

  /** Staff: one quotation with its prices, costs and margin. */
  async get(id: string) {
    await this.expireOverdue();
    const q = await this.load(id);
    const deliveryFee = Number(q.deliveryFee ?? 0);
    const lines = q.lineItems.map((l) => ({
      id: l.id,
      sku: l.product.sku,
      name: l.product.name,
      unit: pricingUnit(l.unitOfSale),
      unitLabel: UNIT_LABEL[l.unitOfSale],
      units: l.product.unitsOfSale.map((u) => ({ unit: pricingUnit(u), label: UNIT_LABEL[u] })),
      quantity: l.quantity,
      note: l.note,
      listUnitPrice: l.estimatedUnitPrice !== null ? Number(l.estimatedUnitPrice) : null,
      unitPrice: Number(l.unitPrice ?? 0),
      unitCost: l.unitCost !== null ? Number(l.unitCost) : null,
      markupPercent: l.markupPercent !== null ? Number(l.markupPercent) : null,
      priceSource: l.priceSource,
      lineTotal: round2(Number(l.unitPrice ?? 0) * l.quantity),
    }));
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      reference: q.reference,
      status: q.status,
      tier: q.pricingTier ?? "RETAIL",
      client: {
        name: q.contactName ?? "",
        companyName: q.companyName,
        email: q.contactEmail,
        phone: q.contactPhone,
        address: q.deliveryAddress,
        province: q.deliveryProvince,
        vatNumber: q.clientVatNumber,
      },
      deliveryDistanceKm: q.deliveryDistanceKm,
      deliveryFee,
      validUntil: q.validUntil,
      notes: q.notes,
      staffNotes: q.staffNotes,
      createdAt: q.createdAt,
      quotedAt: q.quotedAt,
      sentAt: q.sentAt,
      respondedAt: q.respondedAt,
      createdBy: q.createdBy,
      order: q.order,
      linkActive: q.acceptTokenHash !== null && q.status === QuoteStatus.QUOTED,
      lines,
      totals: quoteTotals(lines, deliveryFee),
    };
  }

  async pdf(id: string) {
    const file = await quotationPdf(this.prisma, id);
    if (!file) throw new NotFoundException("Quotation not found.");
    return file;
  }

  // -------------------------------------------------------------------------
  // The client's link: view, download, accept and pay, or decline
  // -------------------------------------------------------------------------

  /** Public: what the client sees — the quotation, never our costs or margins. */
  async view(token: string) {
    await this.expireOverdue();
    const q = await this.byToken(token);
    const deliveryFee = Number(q.deliveryFee ?? 0);
    const lines = q.lineItems.map((l) => ({
      name: l.product.name,
      sku: l.product.sku,
      slug: l.product.slug,
      quantity: l.quantity,
      unitLabel: UNIT_LABEL[l.unitOfSale],
      unitPrice: Number(l.unitPrice ?? 0),
      lineTotal: round2(Number(l.unitPrice ?? 0) * l.quantity),
      note: l.note,
    }));
    const { subtotal, total, vat } = quoteTotals(lines.map((l) => ({ ...l, unitCost: null })), deliveryFee);
    const paid = q.order ? Number(q.order.amountPaid) >= Number(q.order.total) - 0.01 : false;
    return {
      quoteNumber: q.quoteNumber,
      status: q.status,
      issuedAt: q.quotedAt,
      validUntil: q.validUntil,
      preparedBy: q.createdBy?.name ?? null,
      client: { name: q.contactName, companyName: q.companyName },
      delivery: { address: q.deliveryAddress, province: q.deliveryProvince, distanceKm: q.deliveryDistanceKm },
      lines,
      subtotal,
      deliveryFee,
      total,
      vat,
      notes: q.notes,
      order: q.order ? { orderNumber: q.order.orderNumber, paid } : null,
    };
  }

  async viewPdf(token: string) {
    const q = await this.byToken(token);
    return this.pdf(q.id);
  }

  /**
   * Public: the client accepts. The order is made at the quoted prices (once),
   * and a payment link for the full amount is returned to pay straight away.
   * Accepting again later, before paying, just gives a fresh payment link.
   */
  async accept(token: string) {
    await this.expireOverdue();
    const q = await this.byToken(token);
    if (q.status === QuoteStatus.EXPIRED) throw new BadRequestException("This quotation has expired. Contact us and we'll send an updated one.");
    if (q.status === QuoteStatus.DECLINED) throw new BadRequestException("This quotation was declined. Contact us if you'd like an updated one.");
    if (q.status !== QuoteStatus.QUOTED && !(q.status === QuoteStatus.ACCEPTED && q.order)) throw new BadRequestException("This quotation can't be accepted.");
    if (!q.createdById) throw new BadRequestException("This quotation has no sales owner — contact us to accept it.");
    let orderId = q.order?.id;
    if (!orderId) {
      const subtotal = round2(q.lineItems.reduce((t, l) => t + round2(Number(l.unitPrice ?? 0) * l.quantity), 0));
      const deliveryFee = Number(q.deliveryFee ?? 0);
      const order = await this.prisma.order.create({
        data: {
          orderNumber: `AA-${Date.now()}`,
          channel: "QUOTE",
          quoteId: q.id,
          contactEmail: q.contactEmail,
          contactPhone: q.contactPhone,
          status: "PENDING",
          subtotal,
          deliveryFee,
          total: round2(subtotal + deliveryFee),
          deliveryAddress: q.deliveryAddress,
          deliveryProvince: q.deliveryProvince,
          deliveryDistanceKm: q.deliveryDistanceKm,
          distanceSource: q.deliveryDistanceKm !== null ? "CUSTOMER" : null,
          notes: [q.companyName ? `Client: ${q.companyName}` : null, q.contactName ? `Contact: ${q.contactName}` : null, `From quotation ${q.quoteNumber}`].filter(Boolean).join(" · "),
          customerTier: q.pricingTier ?? "RETAIL",
          lineItems: {
            create: q.lineItems.map((l) => ({
              productId: l.productId,
              unitOfSale: l.unitOfSale,
              quantity: l.quantity,
              unitPrice: l.unitPrice ?? 0,
              lineTotal: round2(Number(l.unitPrice ?? 0) * l.quantity),
              listUnitPrice: l.estimatedUnitPrice,
              // The cost staff quoted from — kept for profit reporting (ANALYTICS.md).
              unitCost: l.unitCost,
              costSource: l.unitCost !== null ? ("SNAPSHOT" as const) : null,
            })),
          },
        },
        select: { id: true },
      });
      orderId = order.id;
      await this.prisma.quote.update({ where: { id: q.id }, data: { status: QuoteStatus.ACCEPTED, respondedAt: new Date() } });
      await this.notifications.quote("QUOTE_ACCEPTED", q.id);
      await this.notifications.order("ORDER_PLACED", orderId);
    }
    const link = await this.payments.createLink(
      orderId,
      { kind: "FULL", validDays: PAY_LINK_DAYS, note: `Quotation ${q.quoteNumber}` },
      { id: q.createdById } as AuthUser,
    );
    return { payUrl: link.url };
  }

  async decline(token: string) {
    const q = await this.byToken(token);
    if (q.status !== QuoteStatus.QUOTED) throw new BadRequestException("This quotation can't be declined now.");
    await this.prisma.quote.update({ where: { id: q.id }, data: { status: QuoteStatus.DECLINED, respondedAt: new Date() } });
    await this.notifications.quote("QUOTE_DECLINED", q.id);
    return { declined: true };
  }

  // -------------------------------------------------------------------------

  private async quoteData(dto: SaveSalesQuoteDto) {
    const priced = await this.price(dto);
    if (priced.missingPrices.length) {
      throw new BadRequestException(`Price ${priced.missingPrices.join(", ")}: enter the supplier's cost (we add the markup) or a price.`);
    }
    if (priced.deliveryFee === null) throw new BadRequestException("Enter the delivery fee — the standard delivery rules don't price this load, or no distance was given.");
    const totals = priced.totals!;
    const c = dto.client;
    const quote = {
      contactName: c.name.trim(),
      companyName: c.companyName?.trim() || null,
      contactEmail: c.email?.trim().toLowerCase() || null,
      contactPhone: c.phone?.trim() || null,
      clientVatNumber: c.vatNumber?.trim() || null,
      deliveryAddress: c.address?.trim() || null,
      deliveryProvince: c.province?.trim() || null,
      deliveryDistanceKm: dto.deliveryDistanceKm ?? null,
      pricingTier: priced.tier,
      deliveryFee: priced.deliveryFee,
      notes: dto.notes?.trim() || null,
      staffNotes: dto.staffNotes?.trim() || null,
      estimatedSubtotal: totals.subtotal,
      quotedTotal: totals.total,
      validUntil: new Date(Date.now() + (dto.validDays ?? DEFAULT_VALID_DAYS) * 86_400_000),
    };
    const lines = priced.lines.map((l, i) => ({
      productId: l.productId,
      unitOfSale: unitOfSale(l.unit as PricingUnit),
      quantity: l.quantity,
      estimatedUnitPrice: l.listUnitPrice,
      unitPrice: l.unitPrice!,
      unitCost: l.unitCost,
      markupPercent: l.markupPercent,
      priceSource: l.priceSource,
      note: l.note,
      sortOrder: i,
    }));
    return { quote, lines };
  }

  private async load(id: string): Promise<StaffQuote> {
    const q = await this.prisma.quote.findUnique({ where: { id }, include: STAFF_INCLUDE });
    if (!q || q.channel !== "SALES") throw new NotFoundException("Quotation not found.");
    return q;
  }

  private async byToken(token: string) {
    if (!/^[\w-]{20,64}$/.test(token)) throw new NotFoundException("Quotation not found.");
    const q = await this.prisma.quote.findUnique({ where: { acceptTokenHash: hashToken(token) }, include: STAFF_INCLUDE });
    if (!q || q.channel !== "SALES") throw new NotFoundException("This quotation link isn't valid any more — ask us for the latest one.");
    return q;
  }

  /** Open quotations past their date expire (no order made yet). */
  private async expireOverdue() {
    await this.prisma.quote.updateMany({ where: { channel: "SALES", status: QuoteStatus.QUOTED, validUntil: { lt: new Date() }, order: null }, data: { status: QuoteStatus.EXPIRED } });
  }
}
