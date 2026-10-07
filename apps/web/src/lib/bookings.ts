/** Plant-hire and site-service bookings (Phase C): shared types, labels and formatting. */
export type BookingStatus =
  | "QUOTED"
  | "AWAITING_PAYMENT"
  | "DISPATCHING"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CLOSED"
  | "DISPUTED"
  | "UNFULFILLED"
  | "DECLINED"
  | "CANCELLED";
export type BookingBasis = "DAY" | "WEEK" | "LOAD" | "SKIP" | "M2" | "JOB";
export type PayoutStatus = "PENDING" | "HELD" | "DUE" | "PAID" | "CANCELLED";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  QUOTED: "Quote ready",
  AWAITING_PAYMENT: "Awaiting payment",
  DISPATCHING: "Matching a partner",
  ACCEPTED: "Partner assigned",
  IN_PROGRESS: "In progress",
  COMPLETED: "Signed off",
  CLOSED: "Closed",
  DISPUTED: "Disputed",
  UNFULFILLED: "No partner found",
  DECLINED: "Quote declined",
  CANCELLED: "Cancelled",
};

export const PAYOUT_STATUS_LABEL: Record<PayoutStatus, string> = {
  PENDING: "Job not finished",
  HELD: "In dispute window",
  DUE: "Due — being paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

export const BASIS_OPTIONS: { value: BookingBasis; label: string; one: string; many: string }[] = [
  { value: "DAY", label: "Per day", one: "day", many: "days" },
  { value: "WEEK", label: "Per week", one: "week", many: "weeks" },
  { value: "LOAD", label: "Per load", one: "load", many: "loads" },
  { value: "SKIP", label: "Per skip", one: "skip", many: "skips" },
  { value: "M2", label: "Per m²", one: "m²", many: "m²" },
  { value: "JOB", label: "Whole job", one: "job", many: "jobs" },
];

export function quantityLabel(basis: BookingBasis, quantity: number) {
  const b = BASIS_OPTIONS.find((o) => o.value === basis);
  return `${quantity} ${b ? (quantity === 1 ? b.one : b.many) : ""}`.trim();
}

/** Booking dates are calendar days (stored at UTC midnight). */
export function bookingDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function dateRange(start: string, end: string) {
  return start.slice(0, 10) === end.slice(0, 10) ? bookingDate(start) : `${bookingDate(start)} – ${bookingDate(end)}`;
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg", dateStyle: "medium", timeStyle: "short" });
}

export const statusTone = (status: BookingStatus) =>
  status === "DISPUTED" || status === "UNFULFILLED"
    ? "bg-red-50 text-red-800"
    : status === "QUOTED" || status === "AWAITING_PAYMENT"
      ? "bg-ochre-gold/15 text-basalt"
      : status === "CANCELLED" || status === "DECLINED"
        ? "bg-basalt/5 text-slate"
        : "bg-seam-blue/10 text-seam-blue";

export type Message = { id: string; sender: "CUSTOMER" | "PARTNER" | "STAFF"; body: string; wasRedacted: boolean; createdAt: string };
export type JobCard = { id: string; workDate: string; hoursWorked: string | null; startHourMeter: string | null; endHourMeter: string | null; loads: number | null; notes: string | null };
export type DisputeRecord = { id: string; raisedBy: "CUSTOMER" | "PARTNER" | "STAFF"; reason: string; status: "OPEN" | "RESOLVED"; outcome: "PAY_PARTNER" | "REFUND_CUSTOMER" | null; resolution: string | null; createdAt: string };

export type CustomerBooking = {
  id: string;
  reference: string;
  itemName: string;
  sku: string;
  basis: BookingBasis;
  quantity: number;
  startDate: string;
  endDate: string;
  province: string;
  siteAddress: string;
  siteNotes: string | null;
  customerTotal: string;
  quoteValidUntil: string | null;
  status: BookingStatus;
  cancelledReason: string | null;
  customerRating: number | null;
  paidAt: string | null;
  completedAt: string | null;
  disputeWindowEndsAt: string | null;
  partnerName: string | null;
  chatOpen: boolean;
  payment: { reference: string; bankingDetails: string[] } | null;
  jobCards: JobCard[];
  messages: Message[];
  disputes: DisputeRecord[];
};

export type BookingSummary = { id: string; reference: string; itemName: string; status: BookingStatus; startDate: string; endDate: string; customerTotal: string; province: string; createdAt: string };
