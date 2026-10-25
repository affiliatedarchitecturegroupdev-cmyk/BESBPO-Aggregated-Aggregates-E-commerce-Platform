import { Prisma, type UnitOfSale } from "@aggregates/database";
import { bankingDetailLines, formatDateZA, formatZAR, SELLER, UNIT_LABEL, type Money } from "../common/format";
import { taxWording, VAT_RATE_PERCENT, vatRegistered } from "../tax/tax";
import type { DocSpec } from "./pdf-renderer";

/**
 * The three documents a buyer can download for an order, as pure functions
 * of the order: an order confirmation (with how to pay — not a tax invoice),
 * a delivery note for the driver and site (no prices, signature lines), and
 * the invoice staff issue. Copy rules: no invented prices, dates or
 * banking details; supplier details are never shown (AGENTIC_RULES.md).
 *
 * VAT appears only once the business is VAT-registered (docs/vat.md): until
 * then the documents are VAT-neutral and staff issue a plain invoice.
 */

export { VAT_RATE_PERCENT };

const hasExpress = (o: { expressFee?: Money | null }) => o.expressFee != null && Number(o.expressFee.toString()) > 0;
const hasDdp = (o: { ddpFee?: Money | null }) => o.ddpFee != null && Number(o.ddpFee.toString()) > 0;
/** The Distributed Delivery Premium's line (docs/delivery-premium.md). */
export const DDP_LABEL = "Distributed delivery premium";

export type OrderDocData = {
  orderNumber: string;
  status: string;
  createdAt: Date;
  subtotal: Money;
  deliveryFee: Money;
  /** AA 60/120 express fee (null for standard delivery). */
  expressFee?: Money | null;
  /** Distributed Delivery Premium — extra supply points (null when none applies). */
  ddpFee?: Money | null;
  total: Money;
  /** Paid so far (the payments ledger) — a deposit leaves a balance. */
  amountPaid?: Money;
  deliveryAddress: string | null;
  deliveryProvince: string | null;
  deliveryDistanceKm: number | null;
  contactPhone: string | null;
  notes: string | null;
  customer: { name: string | null; email: string } | null;
  company: { name: string; vatNumber: string | null } | null;
  lines: { name: string; sku: string; quantity: number; unitOfSale: UnitOfSale; unitPrice: Money | null; lineTotal: Money | null }[];
  shipment: { carrier: string; externalPartnerName: string | null; trackingRef: string | null; dispatchedAt: Date | null; deliveredAt: Date | null } | null;
};

export type InvoiceDocData = {
  invoiceNumber: string;
  createdAt: Date;
  status: string;
  paidAt: Date | null;
  /** The Group's VAT number on a tax invoice; null on a plain invoice, issued before VAT registration. */
  vatNumberBilled: string | null;
  billedToName: string | null;
  billedToAddress: string | null;
  billedToVatNumber: string | null;
  amountExVat: Money | null;
  vatAmount: Money | null;
  vatRatePercent: Money | null;
  amountDue: Money;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  IN_TRANSIT: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const quantity = (l: { quantity: number; unitOfSale: UnitOfSale }) => `${l.quantity} ${UNIT_LABEL[l.unitOfSale]}`.replace(/\s+×/, " ×");
const siteAddress = (o: OrderDocData) => (o.deliveryAddress ? `${o.deliveryAddress}${o.deliveryProvince ? `, ${o.deliveryProvince}` : ""}` : "To be confirmed");
const customerLines = (o: OrderDocData) =>
  [o.company?.name, o.customer?.name, o.customer?.email, o.company?.vatNumber ? `VAT ${o.company.vatNumber}` : null].filter((l): l is string => Boolean(l));
const carrier = (s: NonNullable<OrderDocData["shipment"]>) => (s.carrier === "BESFLEET" ? "Besfleet" : (s.externalPartnerName ?? "Delivery partner"));
export const sellerLines = (vatNumber?: string) => [
  `${SELLER.legalName} T/A ${SELLER.tradingName}`,
  `Reg. no. ${SELLER.registrationNumber}`,
  ...SELLER.addressLines,
  `${SELLER.phone} · ${SELLER.email}`,
  ...(vatNumber ? [`VAT registration ${vatNumber} (Besbpo Group)`] : []),
];

/**
 * VAT inside a VAT-inclusive amount, to the cent: VAT = total × 15/115,
 * rounded half-up; the ex-VAT amount is the remainder, so the parts always
 * add back up to the total charged.
 */
export function vatBreakdown(totalInclVat: Money, ratePercent = VAT_RATE_PERCENT) {
  const total = new Prisma.Decimal(totalInclVat.toString());
  const vat = total.mul(ratePercent).div(100 + ratePercent).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
  return { total, vat, exVat: total.minus(vat), ratePercent };
}

/** How to pay by EFT: the configured bank account, or where to ask for it. */
function eftNote(orderNumber: string, bankingDetails?: string): string[] {
  const bank = bankingDetailLines(bankingDetails);
  return bank.length
    ? [`Paying by EFT: use ${orderNumber} as the payment reference.`, ...bank]
    : [`Pay by EFT quoting ${orderNumber} as the reference — our team will send banking details on request (${SELLER.email}).`];
}

export function orderConfirmationSpec(o: OrderDocData, bankingDetails?: string, registered = vatRegistered()): DocSpec {
  const payNote = o.status === "PENDING" ? ["You can also pay online from your order page.", ...eftNote(o.orderNumber, bankingDetails)] : [];
  return {
    title: "Order confirmation",
    subtitle: taxWording(registered).notInvoice,
    sellerLines: sellerLines(),
    meta: [
      ["Order number", o.orderNumber],
      ["Order date", formatDateZA(o.createdAt)],
      ["Status", STATUS_LABEL[o.status] ?? o.status],
    ],
    parties: [
      { heading: "Customer", lines: customerLines(o) },
      { heading: "Deliver to", lines: [siteAddress(o), ...(o.contactPhone ? [`Site contact ${o.contactPhone}`] : [])] },
    ],
    table: {
      columns: [
        { header: "Product", width: 205 },
        { header: "Quantity", width: 110 },
        { header: "Unit price", width: 85, align: "right" },
        { header: "Amount", width: 95, align: "right" },
      ],
      rows: o.lines.map((l) => [l.name, quantity(l), l.unitPrice !== null ? formatZAR(l.unitPrice) : "—", l.lineTotal !== null ? formatZAR(l.lineTotal) : "—"]),
    },
    totals: [
      { label: "Materials", value: formatZAR(o.subtotal) },
      { label: o.deliveryDistanceKm !== null ? `Delivery (${o.deliveryDistanceKm}km)` : "Delivery", value: Number(o.deliveryFee.toString()) === 0 ? "Included" : formatZAR(o.deliveryFee) },
      ...(hasDdp(o) ? [{ label: DDP_LABEL, value: formatZAR(o.ddpFee!) }] : []),
      ...(hasExpress(o) ? [{ label: "AA 60/120 express delivery", value: formatZAR(o.expressFee!) }] : []),
      { label: "Total", value: formatZAR(o.total), strong: true },
    ],
    notes: [
      ...payNote,
      "Delivery distance is confirmed at dispatch. Compliance documents for your materials are on your order record at aaggregates.store.",
    ],
    footer: `${SELLER.tradingName} · ${SELLER.website} · Order ${o.orderNumber}`,
  };
}

/**
 * A proforma invoice: what's to be paid now (the full amount, a deposit or the
 * balance), for an accounts team that needs a document before it pays. Not a
 * tax invoice — that's issued by staff once the order is paid.
 */
export function proformaSpec(o: OrderDocData, due: { amount: Money; kind: string; validUntil?: Date | null }, bankingDetails?: string, registered = vatRegistered()): DocSpec {
  const base = orderConfirmationSpec({ ...o, status: o.status }, bankingDetails, registered);
  const words = taxWording(registered);
  const paid = o.amountPaid !== undefined ? Number(o.amountPaid.toString()) : 0;
  const label = ({ DEPOSIT: "Deposit due now", BALANCE: "Balance due now", INSTALMENT: "Instalment due now" } as Record<string, string>)[due.kind] ?? "Amount due now";
  return {
    ...base,
    title: "Proforma invoice",
    subtitle: registered ? "This is not a tax invoice" : "A request for payment — your invoice follows once the order is paid",
    meta: [
      ["Proforma for order", o.orderNumber],
      ["Date", formatDateZA(new Date())],
      ...(due.validUntil ? ([["Valid until", formatDateZA(due.validUntil)]] as [string, string][]) : []),
      ["Payment reference", o.orderNumber],
    ],
    totals: [
      ...(base.totals ?? []).map((t) => ({ ...t, label: t.label === "Total" ? "Order total" : t.label, strong: false })),
      ...(paid > 0 ? [{ label: "Paid so far", value: formatZAR(paid) }] : []),
      { label, value: formatZAR(due.amount), strong: true },
    ],
    notes: [
      registered ? `${words.priceNote} A tax invoice is issued once the order is paid.` : "An invoice is issued once the order is paid.",
      ...(due.kind === "DEPOSIT" ? ["The deposit secures your order and its prices; the balance is due before delivery."] : []),
      "Pay online with the link we sent you, or by EFT:",
      ...eftNote(o.orderNumber, bankingDetails),
    ],
  };
}

export function deliveryNoteSpec(o: OrderDocData): DocSpec {
  const s = o.shipment;
  return {
    title: "Delivery note",
    sellerLines: sellerLines(),
    meta: [
      ["Order number", o.orderNumber],
      ["Dispatched", s?.dispatchedAt ? formatDateZA(s.dispatchedAt) : "—"],
      ["Carrier", s ? carrier(s) : "—"],
      ...(s?.trackingRef ? ([["Tracking reference", s.trackingRef]] as [string, string][]) : []),
    ],
    parties: [
      { heading: "Deliver to", lines: [siteAddress(o), ...(o.contactPhone ? [`Site contact ${o.contactPhone}`] : [])] },
      { heading: "Customer", lines: customerLines(o).filter((l) => !l.startsWith("VAT ")) },
      ...(o.notes ? [{ heading: "Site access", lines: [o.notes] }] : []),
    ],
    table: {
      columns: [
        { header: "Product", width: 250 },
        { header: "Code", width: 110 },
        { header: "Quantity", width: 135 },
      ],
      rows: o.lines.map((l) => [l.name, l.sku, quantity(l)]),
    },
    notes: [
      "Please check the load against this note before signing. Note any shortfall or damage here and on the driver's copy.",
      "Compliance documents (SANS references and certificates of analysis) are on the order record at aaggregates.store.",
    ],
    signatures: ["Received by (name)", "Signature", "Date and time", "Vehicle registration"],
    footer: `${SELLER.tradingName} · ${SELLER.website} · Order ${o.orderNumber}`,
  };
}

/**
 * The invoice staff issue: a tax invoice with the VAT breakdown once the business is VAT-registered (the Group's
 * VAT number was frozen on it), otherwise a plain invoice with no VAT anywhere (docs/vat.md).
 */
export function taxInvoiceSpec(inv: InvoiceDocData, o: OrderDocData, bankingDetails?: string): DocSpec {
  const taxInvoice = inv.vatNumberBilled !== null;
  const rate = inv.vatRatePercent !== null ? Number(inv.vatRatePercent.toString()) : VAT_RATE_PERCENT;
  const status = inv.status === "PAID" ? `Paid${inv.paidAt ? ` ${formatDateZA(inv.paidAt)}` : ""}` : inv.status === "VOID" ? "Void" : "Unpaid";
  return {
    title: taxInvoice ? "Tax invoice" : "Invoice",
    subtitle: inv.status === "VOID" ? "VOID — this invoice has been cancelled" : undefined,
    sellerLines: sellerLines(inv.vatNumberBilled ?? undefined),
    meta: [
      ["Invoice number", inv.invoiceNumber],
      ["Invoice date", formatDateZA(inv.createdAt)],
      ["Order number", o.orderNumber],
      ["Status", status],
    ],
    parties: [
      {
        heading: "Billed to",
        lines: [inv.billedToName, inv.billedToAddress, inv.billedToVatNumber ? `VAT ${inv.billedToVatNumber}` : null].filter((l): l is string => Boolean(l)),
      },
      { heading: "Delivered to", lines: [siteAddress(o)] },
    ],
    table: {
      columns: [
        { header: "Description", width: 205 },
        { header: "Quantity", width: 110 },
        { header: taxInvoice ? "Unit price (incl. VAT)" : "Unit price", width: 90, align: "right" },
        { header: taxInvoice ? "Amount (incl. VAT)" : "Amount", width: 90, align: "right" },
      ],
      rows: [
        ...o.lines.map((l) => [l.name, quantity(l), l.unitPrice !== null ? formatZAR(l.unitPrice) : "—", l.lineTotal !== null ? formatZAR(l.lineTotal) : "—"]),
        ...(Number(o.deliveryFee.toString()) > 0 ? [[`Delivery${o.deliveryDistanceKm !== null ? ` (${o.deliveryDistanceKm}km)` : ""}`, "1", formatZAR(o.deliveryFee), formatZAR(o.deliveryFee)]] : []),
        ...(hasDdp(o) ? [[DDP_LABEL, "1", formatZAR(o.ddpFee!), formatZAR(o.ddpFee!)]] : []),
        ...(hasExpress(o) ? [["AA 60/120 express delivery", "1", formatZAR(o.expressFee!), formatZAR(o.expressFee!)]] : []),
      ],
    },
    totals: taxInvoice
      ? [
          { label: "Total excl. VAT", value: inv.amountExVat !== null ? formatZAR(inv.amountExVat) : "—" },
          { label: `VAT at ${rate}%`, value: inv.vatAmount !== null ? formatZAR(inv.vatAmount) : "—" },
          { label: "Total incl. VAT", value: formatZAR(inv.amountDue), strong: true },
        ]
      : [{ label: "Total amount payable", value: formatZAR(inv.amountDue), strong: true }],
    notes: [
      taxInvoice
        ? `Prices include VAT at ${rate}%. ${SELLER.tradingName} trades as a division of ${SELLER.legalName} and invoices under the Group's VAT registration.`
        : `${SELLER.tradingName} trades as a division of ${SELLER.legalName}, which issues this invoice.`,
      ...(inv.status === "UNPAID" ? eftNote(o.orderNumber, bankingDetails) : []),
    ],
    footer: `${SELLER.legalName} T/A ${SELLER.tradingName} · Reg. ${SELLER.registrationNumber}${taxInvoice ? ` · VAT ${inv.vatNumberBilled}` : ""} · Invoice ${inv.invoiceNumber}`,
  };
}
