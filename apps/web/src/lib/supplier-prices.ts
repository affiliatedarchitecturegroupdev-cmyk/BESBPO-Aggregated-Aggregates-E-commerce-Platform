/** Shapes of the staff supplier-price API (docs/supplier-prices.md). */

export type PriceLineStatus = "PENDING" | "APPROVED" | "REJECTED" | "UNMATCHED";

export type PriceListSummary = {
  id: string;
  source: "SUPPLIER_LIST" | "QUOTATION";
  supplierName: string;
  fileName: string | null;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  supplierLocation: { name: string; province: string } | null;
  counts: Record<PriceLineStatus, number>;
};

export type PriceLine = {
  id: string;
  rowNumber: number;
  supplierCode: string | null;
  description: string;
  sku: string | null;
  unit: string | null;
  unitCost: string;
  currentPrice: string | null;
  markupPercent: string | null;
  suggestedPrice: string | null;
  approvedPrice: string | null;
  status: PriceLineStatus;
  problem: string | null;
  product: { sku: string; name: string; slug: string } | null;
};

export type PriceListDetail = Omit<PriceListSummary, "counts"> & { lines: PriceLine[] };

export type LiveSupplierPrice = {
  id: string;
  sku: string;
  unit: string;
  listPrice: string;
  unitCost: string;
  markupPercent: string;
  source: "SUPPLIER_LIST" | "QUOTATION";
  supplierName: string | null;
  validUntil: string | null;
  approvedAt: string;
  product: { name: string; slug: string } | null;
};

export type PriceCoverage = { livePrices: number; liveSkus: number; expiringIn7Days: number; pending: number; unmatched: number };

export const LINE_STATUS_LABEL: Record<PriceLineStatus, string> = { PENDING: "Waiting for approval", APPROVED: "Live", REJECTED: "Rejected", UNMATCHED: "Needs a product" };

export const money = (v: string | number | null | undefined) => (v === null || v === undefined || v === "" ? "—" : `R${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
export const saDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" }) : "—");
