/** Types for trade credit, deliveries, proof of delivery and the supplier portal (docs/trade-credit.md, docs/deliveries.md, docs/supplier-portal.md). */

export type CreditStatus = "NONE" | "APPLIED" | "APPROVED" | "DECLINED" | "SUSPENDED";
export type CreditPosition = { status: CreditStatus; limit: number; termsDays: number | null; used: number; overdue: number; overdueOrders: number; available: number };
export type AccountOrder = { id: string; orderNumber: string; status: string; total: number; amountPaid: number; balance: number; accountDueAt: string | null; overdue: boolean; createdAt: string };
export type MyCredit = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "DECLINED";
  creditStatus: CreditStatus;
  creditLimit: number | null;
  paymentTermsDays: number | null;
  creditAppliedAt: string | null;
  creditReviewedAt: string | null;
  creditNotes: string | null;
  canApply: boolean;
  position: CreditPosition;
  orders: AccountOrder[];
};
export type CreditAccount = {
  id: string;
  name: string;
  tier: string;
  registrationNumber: string | null;
  vatNumber: string | null;
  creditStatus: CreditStatus;
  creditLimit: number | null;
  paymentTermsDays: number | null;
  creditApplication: { requestedLimit?: number; requestedTermsDays?: number; yearsTrading?: number; estimatedMonthlySpend?: number | null; tradeReferences?: string; accountsContact?: string | null; notes?: string | null; acceptedTermsAt?: string } | null;
  creditAppliedAt: string | null;
  creditReviewedAt: string | null;
  creditNotes: string | null;
  users: { email: string; name: string | null; role: string }[];
  position: CreditPosition;
};
export const CREDIT_TERMS_DAYS = [7, 14, 30, 60] as const;
export const CREDIT_STATUS_LABEL: Record<CreditStatus, string> = { NONE: "No trade credit", APPLIED: "Application with our team", APPROVED: "Open", DECLINED: "Declined", SUSPENDED: "Suspended" };

export type DropStatus = "PLANNED" | "CONFIRMED" | "DISPATCHED" | "DELIVERED" | "CANCELLED";
export type Proof = { id: string; receivedBy: string; capturedAt: string; capturedVia: string; exceptions: string | null; hasSignature: boolean; hasPhoto: boolean; location: { latitude: number; longitude: number } | null };
export type Drop = {
  id: string;
  sequence: number;
  scheduledFor: string;
  status: DropStatus;
  value: number;
  notes: string | null;
  supplierReadyAt: string | null;
  carrier: "BESFLEET" | "EXTERNAL_PARTNER" | null;
  trackingRef: string | null;
  dispatchedAt: string | null;
  deliveredAt: string | null;
  lines: { lineItemId: string; quantity: number; name: string; sku: string; unitOfSale: string | null }[];
  proof: Proof | null;
  podLinkOpen: boolean;
};
export type Deliveries = {
  orderId: string;
  orderNumber: string;
  status: string;
  isPhased: boolean;
  paymentPlan: string;
  canPlan: boolean;
  planBlockedReason: string | null;
  lines: { id: string; name: string; sku: string; unitOfSale: string; quantity: number; lineTotal: number }[];
  drops: Drop[];
  proof: Proof | null;
  podLinkOpen: boolean;
};
export const DROP_STATUS_LABEL: Record<DropStatus, string> = { PLANNED: "Planned", CONFIRMED: "Date confirmed", DISPATCHED: "On its way", DELIVERED: "Delivered", CANCELLED: "Cancelled" };

export type PortalOrder = {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
  deliveryAddress: string | null;
  deliveryProvince: string | null;
  notes: string | null;
  isPhased: boolean;
  supplierAckAt: string | null;
  supplierReadyAt: string | null;
  supplierDeclinedAt: string | null;
  supplierNote: string | null;
  canLoad: boolean;
  lineItems: { id: string; name: string; sku: string; quantity: number; unitOfSale: string }[];
  drops: { id: string; sequence: number; scheduledFor: string; status: DropStatus; supplierReadyAt: string | null; dispatchedAt: string | null; deliveredAt: string | null; lines: { lineItemId: string; quantity: number; name: string; unitOfSale: string | null }[] }[];
  shipment: { carrier: string; dispatchedAt: string | null; deliveredAt: string | null } | null;
  proofs: { id: string; dropId: string | null; receivedBy: string; capturedAt: string; exceptions: string | null }[];
};

export type LeadTime = { categorySlug: string; minDays: number; maxDays: number; note?: string };

/** "2–3 working days" (or "Next working day", "Same day"). */
export function leadTimeLabel(t: LeadTime): string {
  if (t.maxDays === 0) return "Same day";
  if (t.minDays === t.maxDays) return t.minDays === 1 ? "Next working day" : `${t.minDays} working days`;
  return `${t.minDays}–${t.maxDays} working days`;
}

/** Tomorrow in South Africa, as YYYY-MM-DD (the earliest date a drop can be planned for). */
export function saTomorrow(now = new Date()): string {
  return new Date(now.getTime() + 2 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);
}
