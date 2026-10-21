/** Sales quotations (docs/sales-quotes.md) — the shapes the admin panel and the client's page use. */
export type QuoteUnit = { unit: string; label: string };
export type PriceMode = "LIST" | "COST" | "PRICE";

export type QuotationTotals = { subtotal: number; deliveryFee: number; total: number; vat: number; exVat: number; cost: number | null; margin: number | null; marginPercent: number | null };

export type SalesQuotation = {
  id: string;
  quoteNumber: string | null;
  reference: string;
  status: "DRAFT" | "QUOTED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "SUBMITTED";
  tier: "RETAIL" | "CONTRACTOR_TRADE" | "VOLUME_CIVIL_BULK";
  client: { name: string; companyName: string | null; email: string | null; phone: string | null; address: string | null; province: string | null; vatNumber: string | null };
  deliveryDistanceKm: number | null;
  deliveryFee: number;
  validUntil: string | null;
  notes: string | null;
  staffNotes: string | null;
  createdAt: string;
  quotedAt: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  createdBy: { name: string | null; email: string } | null;
  order: { id: string; orderNumber: string; status: string; total: string; amountPaid: string } | null;
  linkActive: boolean;
  lines: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    unitLabel: string;
    units: QuoteUnit[];
    quantity: number;
    note: string | null;
    listUnitPrice: number | null;
    unitPrice: number;
    unitCost: number | null;
    markupPercent: number | null;
    priceSource: "LIST" | "SUPPLIER_COST" | "MANUAL" | null;
    lineTotal: number;
  }[];
  totals: QuotationTotals;
};

export type QuotationListRow = {
  id: string;
  quoteNumber: string | null;
  status: SalesQuotation["status"];
  contactName: string | null;
  companyName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  quotedTotal: string | null;
  validUntil: string | null;
  createdAt: string;
  sentAt: string | null;
  createdBy: { name: string | null } | null;
  order: { id: string; orderNumber: string; status: string } | null;
  _count: { lineItems: number };
};

export type PricedQuotation = {
  tier: string;
  lines: {
    sku: string;
    name: string;
    unit: string;
    unitLabel: string;
    quantity: number;
    listUnitPrice: number | null;
    standardMarkupPercent: number | null;
    unitPrice: number | null;
    unitCost: number | null;
    markupPercent: number | null;
    priceSource: "LIST" | "SUPPLIER_COST" | "MANUAL" | null;
    lineTotal: number | null;
  }[];
  suggestedDelivery: { standard: number | null; premium: number; total: number | null; note: string } | null;
  deliveryFee: number | null;
  missingPrices: string[];
  totals: QuotationTotals | null;
};

export type QuotationInput = {
  client: { name: string; companyName?: string; email?: string; phone?: string; address?: string; province?: string; vatNumber?: string };
  tier: SalesQuotation["tier"];
  deliveryDistanceKm: number | null;
  deliveryFee: number | null;
  validDays: number;
  notes?: string;
  staffNotes?: string;
  lines: { sku: string; unit: string; quantity: number; unitPrice?: number | null; unitCost?: number | null; markupPercent?: number | null; note?: string }[];
};

export const QUOTE_STATUS_LABEL: Record<SalesQuotation["status"], string> = {
  DRAFT: "Draft",
  QUOTED: "Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  SUBMITTED: "Submitted",
};
