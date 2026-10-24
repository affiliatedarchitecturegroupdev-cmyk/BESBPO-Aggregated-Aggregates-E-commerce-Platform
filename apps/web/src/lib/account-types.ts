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
  /** A bill of quantities the request was built from (docs/boq-upload.md). */
  boqFileName?: string | null;
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
  /** The order staff made from this quote, if any (payable by link, deposit or EFT). */
  order?: { id: string; orderNumber: string; status: string; total: string; amountPaid: string } | null;
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
  paidAt?: string | null;
  /** Payments ledger: paid so far, and FULL / DEPOSIT / LAYBY. */
  amountPaid?: string;
  paymentPlan?: "FULL" | "DEPOSIT" | "LAYBY" | "ACCOUNT";
  depositPercent?: number | null;
  /** Trade credit: when an order on account is due (docs/trade-credit.md). */
  accountDueAt?: string | null;
  /** Delivered in dated drops (docs/deliveries.md). */
  isPhased?: boolean;
  lineItems: { id?: string; quantity?: number; unitOfSale?: keyof typeof UNIT_LABEL; lineTotal?: string; product: { name: string; sku?: string; slug?: string } }[];
  shipment?: { carrier: string; externalPartnerName: string | null; trackingRef: string | null; dispatchedAt: string | null; deliveredAt: string | null } | null;
  documents: DocumentSummary[];
  invoice?: InvoiceSummary | null;
  /** AA 60/120: the fee (null = standard delivery; "0.00" once declined before payment) and the clock the API works out. */
  expressFee?: string | null;
  /** Distributed Delivery Premium (docs/delivery-premium.md). */
  ddpFee?: string | null;
  ddpDetail?: { tier: string; origins: { key: string; label: string; products: number; tons: number }[]; originFee: number; weightFee: number; extraHeavyTons: number } | null;
  expressNote?: string | null;
  express?: ExpressStatus | null;
};

export type ExpressOutcome = "AWAITING_PAYMENT" | "AWAITING_ACCEPTANCE" | "IN_PROGRESS" | "ON_TIME" | "LATE" | "REFUND_DUE" | "DECLINED" | "CANCELLED";

export type ExpressStatus = {
  outcome: ExpressOutcome;
  clockStartsAt: string | null;
  dueAt: string | null;
  refundAfter: string | null;
  feeRefundDue: boolean;
};

export const EXPRESS_OUTCOME_LABEL: Record<ExpressOutcome, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  AWAITING_ACCEPTANCE: "Paid — confirming a supplier",
  IN_PROGRESS: "Clock running",
  ON_TIME: "Delivered on time",
  LATE: "Delivered late (within the hour's grace)",
  REFUND_DUE: "More than an hour late — fee refundable",
  DECLINED: "Moved to standard delivery",
  CANCELLED: "Cancelled",
};

/** "14:35" in South African time. */
export function formatTimeZA(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });
}

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

/** Every UnitOfSale, matching apps/api/src/common/format.ts (receipts, PDFs and emails use that copy). */
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
  LENGTH_6M: "× 6 m length",
  LENGTH_12M: "× 12 m length",
  TONNE: "tonne",
  SHEET: "× sheet",
  ROLL: "× roll",
  COIL: "× coil",
  PACK: "× pack",
  EACH: "× item",
  THOUSAND: "× 1,000",
  SHEET_3_0M: "× 3.0 m sheet",
  SHEET_3_6M: "× 3.6 m sheet",
  SHEET_4_2M: "× 4.2 m sheet",
  SHEET_4_8M: "× 4.8 m sheet",
  SHEET_6_0M: "× 6.0 m sheet",
  SHEET_6_6M: "× 6.6 m sheet",
  METRE: "m, cut to length",
  TIMBER_3_0M: "× 3.0 m length",
  TIMBER_3_6M: "× 3.6 m length",
  TIMBER_4_2M: "× 4.2 m length",
  TIMBER_4_8M: "× 4.8 m length",
  TIMBER_6_0M: "× 6.0 m length",
  TIMBER_6_6M: "× 6.6 m length",
  SQUARE_METRE: "m²",
  LINEAR_METRE: "× metre",
  CUBIC_METRE: "m³",
  KG: "kg",
  BUNDLE: "× bundle",
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

/** GET /payments/orders/:id — what's owed on an order and the tiles for each way to pay. */
export type PaymentTile = { methodKey: string; displayName: string };
export type PaymentTiles = { recommended: PaymentTile[]; available: PaymentTile[] };
export type LedgerPayment = {
  id: string;
  kind: "FULL" | "DEPOSIT" | "BALANCE" | "INSTALMENT";
  amount: number;
  methodKey: string;
  gateway: string;
  status: "INITIATED" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
  paidSoFar: number | null;
  providerReference: string | null;
  createdAt: string;
  paidAt: string | null;
};
export type OrderPayments = {
  orderId: string;
  orderNumber: string;
  status: OrderRecord["status"];
  total: number;
  amountPaid: number;
  balance: number;
  overpaid: number;
  paymentPlan: "FULL" | "DEPOSIT" | "LAYBY" | "ACCOUNT";
  depositPercent: number | null;
  deposit: { available: true; percent: number; amount: number; balance: number } | { available: false; reason: string };
  layby: { terms: { depositPercent: number; maxMonths: number }; active: { status: string; paidSoFar: number; startedAt: string } | null };
  payments: LedgerPayment[];
  choices: { full: PaymentTiles | null; deposit: PaymentTiles | null; balance: PaymentTiles | null };
};

export const PAYMENT_KIND_LABEL: Record<LedgerPayment["kind"], string> = { FULL: "Payment in full", DEPOSIT: "Deposit", BALANCE: "Balance", INSTALMENT: "Part payment" };
