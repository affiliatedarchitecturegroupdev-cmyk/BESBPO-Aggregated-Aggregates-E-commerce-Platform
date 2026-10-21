import type { Prisma, PrismaClient, UnitOfSale } from "@aggregates/database";
import { formatDateZA, formatZAR, SELLER } from "../common/format";
import { quoteTotals, VAT_PERCENT } from "../quotes/sales-quote";
import { quantity, sellerLines } from "./order-documents";
import { renderPdf, type DocSpec } from "./pdf-renderer";

/** What a quotation PDF needs (docs/sales-quotes.md). */
export const QUOTATION_INCLUDE = {
  lineItems: { orderBy: { sortOrder: "asc" }, include: { product: { select: { name: true, sku: true } } } },
  createdBy: { select: { name: true, email: true } },
} satisfies Prisma.QuoteInclude;
export type QuotationRecord = Prisma.QuoteGetPayload<{ include: typeof QUOTATION_INCLUDE }>;

type Line = { name: string; sku: string; quantity: number; unitOfSale: UnitOfSale; unitPrice: number; note: string | null };

export type QuotationDocData = {
  quoteNumber: string;
  reference: string;
  status: string;
  issuedAt: Date;
  validUntil: Date | null;
  preparedBy: string | null;
  client: { name: string | null; companyName: string | null; email: string | null; phone: string | null; vatNumber: string | null };
  delivery: { address: string | null; province: string | null; distanceKm: number | null };
  lines: Line[];
  deliveryFee: number;
  notes: string | null;
};

export function toQuotationData(q: QuotationRecord): QuotationDocData {
  return {
    quoteNumber: q.quoteNumber ?? `Draft ${q.reference.slice(-6).toUpperCase()}`,
    reference: q.reference,
    status: q.status,
    issuedAt: q.quotedAt ?? q.createdAt,
    validUntil: q.validUntil,
    preparedBy: q.createdBy?.name ?? null,
    client: { name: q.contactName, companyName: q.companyName, email: q.contactEmail, phone: q.contactPhone, vatNumber: q.clientVatNumber },
    delivery: { address: q.deliveryAddress, province: q.deliveryProvince, distanceKm: q.deliveryDistanceKm },
    lines: q.lineItems.map((l) => ({ name: l.product.name, sku: l.product.sku, quantity: l.quantity, unitOfSale: l.unitOfSale, unitPrice: Number(l.unitPrice ?? 0), note: l.note })),
    deliveryFee: Number(q.deliveryFee ?? 0),
    notes: q.notes,
  };
}

/** The quotation as a document: what's quoted, for whom, until when, and how to accept it. */
export function quotationSpec(q: QuotationDocData): DocSpec {
  const totals = quoteTotals(q.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice, unitCost: null })), q.deliveryFee);
  const draft = q.status === "DRAFT";
  const site = q.delivery.address ? `${q.delivery.address}${q.delivery.province ? `, ${q.delivery.province}` : ""}` : (q.delivery.province ?? "To be confirmed");
  return {
    title: "Quotation",
    subtitle: draft ? "DRAFT — not yet issued" : q.validUntil ? `Valid until ${formatDateZA(q.validUntil)}` : undefined,
    sellerLines: sellerLines(),
    meta: [
      ["Quotation number", q.quoteNumber],
      ["Date", formatDateZA(q.issuedAt)],
      ...(q.validUntil ? ([["Valid until", formatDateZA(q.validUntil)]] as [string, string][]) : []),
      ...(q.preparedBy ? ([["Prepared by", q.preparedBy]] as [string, string][]) : []),
    ],
    parties: [
      {
        heading: "Quoted for",
        lines: [q.client.companyName, q.client.name, q.client.email, q.client.phone, q.client.vatNumber ? `VAT ${q.client.vatNumber}` : null].filter((l): l is string => Boolean(l)),
      },
      { heading: "Deliver to", lines: [site, ...(q.delivery.distanceKm !== null ? [`About ${q.delivery.distanceKm} km from our partner supplier`] : [])] },
    ],
    table: {
      columns: [
        { header: "Product", width: 225 },
        { header: "Quantity", width: 90 },
        { header: "Unit price", width: 85, align: "right" },
        { header: "Amount", width: 95, align: "right" },
      ],
      rows: q.lines.map((l) => [`${l.name}\n${l.sku}${l.note ? ` · ${l.note}` : ""}`, quantity(l), formatZAR(l.unitPrice), formatZAR(l.unitPrice * l.quantity)]),
    },
    totals: [
      { label: "Materials", value: formatZAR(totals.subtotal) },
      { label: q.delivery.distanceKm !== null ? `Delivery (${q.delivery.distanceKm} km)` : "Delivery", value: totals.deliveryFee === 0 ? "Included" : formatZAR(totals.deliveryFee) },
      { label: "Total (VAT inclusive)", value: formatZAR(totals.total), strong: true },
      { label: `Includes VAT at ${VAT_PERCENT}%`, value: formatZAR(totals.vat) },
    ],
    notes: [
      ...(q.notes ? [q.notes] : []),
      `Prices include VAT at ${VAT_PERCENT}% and delivery as shown${q.validUntil ? `, and hold until ${formatDateZA(q.validUntil)}` : ""}. Stock is confirmed with our partner supplier when you accept.`,
      "To accept, use the secure link we sent with this quotation — you can pay online there — or reply to us quoting the quotation number.",
      `Questions? Call ${SELLER.phone} or email ${SELLER.email}. Our terms and the Shipping & Delivery policy are at ${SELLER.website}/legal.`,
    ],
    footer: `${SELLER.tradingName} · ${SELLER.website} · Quotation ${q.quoteNumber}`,
  };
}

export async function quotationPdf(prisma: Pick<PrismaClient, "quote">, quoteId: string): Promise<{ fileName: string; pdf: Buffer } | null> {
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: QUOTATION_INCLUDE });
  if (!quote) return null;
  const data = toQuotationData(quote);
  return { fileName: `${data.quoteNumber.replace(/\s+/g, "-")}-quotation.pdf`, pdf: await renderPdf(quotationSpec(data)) };
}
