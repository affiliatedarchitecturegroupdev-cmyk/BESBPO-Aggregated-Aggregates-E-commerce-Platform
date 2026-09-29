import type { TierName } from "./session";

/** Shapes returned by the API for the account pages. Decimal columns arrive as strings. */
export type QuoteStatus = "DRAFT" | "SUBMITTED" | "QUOTED" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export type QuoteRecord = {
  id: string;
  reference: string;
  status: QuoteStatus;
  reasonCode: string;
  reasons: string[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  companyName: string | null;
  projectName: string | null;
  deliveryAddress: string | null;
  deliveryProvince: string | null;
  deliveryDistanceKm: number | null;
  notes: string | null;
  estimatedSubtotal: string | null;
  quotedTotal: string | null;
  staffNotes: string | null;
  createdAt: string;
  lineItems: {
    id: string;
    unitOfSale: keyof typeof UNIT_LABEL;
    quantity: number;
    estimatedUnitPrice: string | null;
    product: { name: string; sku: string };
  }[];
};

export type CompanyDashboard = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  registrationNumber: string | null;
  vatNumber: string | null;
  standingAgreementRef: string | null;
  reviewNotes: string | null;
  tier: { name: TierName; discountPercent: string };
  requestedTier: { name: TierName } | null;
  deliveryAddresses: {
    id: string;
    label: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    province: string;
    postalCode: string;
    isDefault: boolean;
  }[];
  invoices: { id: string; invoiceNumber: string; amountDue: string; status: string; dueDate: string | null }[];
};

export type OrderRecord = {
  id: string;
  orderNumber: string;
  status: "PENDING" | "CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  channel?: string;
  deliveryAddress?: string | null;
  deliveryProvince?: string | null;
  deliveryDistanceKm?: number | null;
  subtotal: string;
  deliveryFee: string;
  total: string;
  createdAt: string;
  lineItems: { id?: string; quantity?: number; unitOfSale?: keyof typeof UNIT_LABEL; lineTotal?: string; product: { name: string; sku?: string; slug?: string } }[];
  shipment?: { carrier: string; externalPartnerName: string | null; trackingRef: string | null; dispatchedAt: string | null; deliveredAt: string | null } | null;
  documents: DocumentSummary[];
  invoice?: InvoiceSummary | null;
};

export type InvoiceSummary = { id: string; invoiceNumber: string; status: "UNPAID" | "PAID" | "OVERDUE" | "VOID"; amountDue?: string; createdAt?: string };

/** A saved delivery site — a trade company's (shared) or the customer's own. */
export type SavedAddress = {
  id: string;
  label: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  shared?: boolean;
};

export const ORDER_STATUS_LABEL: Record<OrderRecord["status"], string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  IN_TRANSIT: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUS_STYLE: Record<OrderRecord["status"], string> = {
  PENDING: "bg-ochre-gold/15 text-basalt",
  CONFIRMED: "bg-seam-blue/10 text-seam-blue",
  IN_TRANSIT: "bg-seam-blue/10 text-seam-blue",
  DELIVERED: "bg-limestone text-basalt",
  CANCELLED: "bg-red-50 text-red-800",
};

/** The cart unit a stored unit of sale reorders as (packaged units keep their own codes). */
export function cartUnit(unitOfSale: keyof typeof UNIT_LABEL): string {
  return unitOfSale === "BULK_TON" ? "ton" : unitOfSale === "BULK_M3" ? "m3" : unitOfSale === "BAGGED" ? "bag" : unitOfSale;
}

export type Application = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  registrationNumber: string | null;
  vatNumber: string | null;
  contactPhone: string | null;
  applicationNotes: string | null;
  reviewNotes: string | null;
  createdAt: string;
  tier: { name: TierName };
  requestedTier: { name: TierName } | null;
  users: { email: string; name: string | null }[];
};

export const UNIT_LABEL = {
  BULK_TON: "ton",
  BULK_M3: "m³",
  BAGGED: "bags",
  BAG_25KG: "× 25kg bag",
  BAG_50KG: "× 50kg bag",
  BULK_BAG_1_5T: "× 1.5-ton bulk bag",
  BULK_TANKER_PER_TON: "ton (tanker)",
  DRUM_210L: "× 210L drum",
  IBC_TOTE_1000L: "× 1,000L tote",
} as const;

export const TIER_LABEL: Record<TierName, string> = {
  RETAIL: "Retail",
  CONTRACTOR_TRADE: "Contractor / Trade",
  VOLUME_CIVIL_BULK: "Volume / Civil Bulk",
};

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Awaiting our quote",
  QUOTED: "Quoted — your response needed",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
};

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });
}

export type DocumentSummary = {
  id: string;
  title: string;
  standard: string;
  documentType: "SANS_REFERENCE" | "CERTIFICATE_OF_ANALYSIS" | "OTHER";
  batchReference: string | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  issuedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  orderId: string | null;
  product: { sku: string; name: string };
};

export const DOCUMENT_TYPE_LABEL: Record<DocumentSummary["documentType"], string> = {
  SANS_REFERENCE: "SANS reference",
  CERTIFICATE_OF_ANALYSIS: "Certificate of Analysis",
  OTHER: "Document",
};

export function formatBytes(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
