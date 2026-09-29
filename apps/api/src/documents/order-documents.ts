import { Prisma, type UnitOfSale } from "@aggregates/database";
import { formatDateZA, formatZAR, SELLER, UNIT_LABEL, type Money } from "../common/format";
import type { DocSpec } from "./pdf-renderer";

/**
 * The three documents a buyer can download for an order, as pure functions
 * of the order: an order confirmation (with how to pay — not a tax invoice),
 * a delivery note for the driver and site (no prices, signature lines), and
 * the tax invoice staff issue. Copy rules: no invented prices, dates or
 * banking details; supplier details are never shown (AGENTIC_RULES.md).
 */

export const VAT_RATE_PERCENT = 15; // South African standard rate

export type OrderDocData = {
  orderNumber: string;
  status: string;
  createdAt: Date;
  subtotal: Money;
  deliveryFee: Money;
  total: Money;
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
  vatNumberBilled: string;
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

const quantity = (l: { quantity: number; unitOfSale: UnitOfSale }) => `${l.quantity} ${UNIT_LABEL[l.unitOfSale]}`.replace(/\s+×/, " ×");
const siteAddress = (o: OrderDocData) => (o.deliveryAddress ? `${o.deliveryAddress}${o.deliveryProvince ? `, ${o.deliveryProvince}` : ""}` : "To be confirmed");
const customerLines = (o: OrderDocData) =>
  [o.company?.name, o.customer?.name, o.customer?.email, o.company?.vatNumber ? `VAT ${o.company.vatNumber}` : null].filter((l): l is string => Boolean(l));
const carrier = (s: NonNullable<OrderDocData["shipment"]>) => (s.carrier === "BESFLEET" ? "Besfleet" : (s.externalPartnerName ?? "Delivery partner"));
const sellerLines = (vatNumber?: string) => [
  `A division of ${SELLER.legalName}`,
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

export function orderConfirmationSpec(o: OrderDocData, bankingDetails?: string): DocSpec {
  const payNote =
    o.status === "PENDING"
      ? bankingDetails?.trim()
        ? [`Paying by EFT: use ${o.orderNumber} as the payment reference.`, ...bankingDetails.trim().split(/\r?\n/)]
        : [`Pay online from your order page, or by EFT quoting ${o.orderNumber} as the reference — our team will send banking details on request (${SELLER.email}).`]
      : [];
  return {
    title: "Order confirmation",
    subtitle: "This is not a tax invoice",
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
      { label: "Total", value: formatZAR(o.total), strong: true },
    ],
    notes: [
      ...payNote,
      "Delivery distance is confirmed at dispatch. Compliance documents for your materials are on your order record at aggregates.store.",
    ],
    footer: `${SELLER.tradingName} · ${SELLER.website} · Order ${o.orderNumber}`,
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
      "Compliance documents (SANS references and certificates of analysis) are on the order record at aggregates.store.",
    ],
    signatures: ["Received by (name)", "Signature", "Date and time", "Vehicle registration"],
    footer: `${SELLER.tradingName} · ${SELLER.website} · Order ${o.orderNumber}`,
  };
}

export function taxInvoiceSpec(inv: InvoiceDocData, o: OrderDocData): DocSpec {
  const rate = inv.vatRatePercent !== null ? Number(inv.vatRatePercent.toString()) : VAT_RATE_PERCENT;
  const status = inv.status === "PAID" ? `Paid${inv.paidAt ? ` ${formatDateZA(inv.paidAt)}` : ""}` : inv.status === "VOID" ? "Void" : "Unpaid";
  return {
    title: "Tax invoice",
    subtitle: inv.status === "VOID" ? "VOID — this invoice has been cancelled" : undefined,
    sellerLines: sellerLines(inv.vatNumberBilled),
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
        { header: "Unit price (incl. VAT)", width: 90, align: "right" },
        { header: "Amount (incl. VAT)", width: 90, align: "right" },
      ],
      rows: [
        ...o.lines.map((l) => [l.name, quantity(l), l.unitPrice !== null ? formatZAR(l.unitPrice) : "—", l.lineTotal !== null ? formatZAR(l.lineTotal) : "—"]),
        ...(Number(o.deliveryFee.toString()) > 0 ? [[`Delivery${o.deliveryDistanceKm !== null ? ` (${o.deliveryDistanceKm}km)` : ""}`, "1", formatZAR(o.deliveryFee), formatZAR(o.deliveryFee)]] : []),
      ],
    },
    totals: [
      { label: "Total excl. VAT", value: inv.amountExVat !== null ? formatZAR(inv.amountExVat) : "—" },
      { label: `VAT at ${rate}%`, value: inv.vatAmount !== null ? formatZAR(inv.vatAmount) : "—" },
      { label: "Total incl. VAT", value: formatZAR(inv.amountDue), strong: true },
    ],
    notes: [
      `Prices include VAT at ${rate}%. ${SELLER.tradingName} trades as a division of ${SELLER.legalName} and invoices under the Group's VAT registration.`,
      ...(inv.status === "UNPAID" ? [`Payment reference: ${o.orderNumber}.`] : []),
    ],
    footer: `${SELLER.legalName} · VAT ${inv.vatNumberBilled} · Invoice ${inv.invoiceNumber}`,
  };
}
