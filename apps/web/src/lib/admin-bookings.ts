import type { BookingBasis, BookingStatus, DisputeRecord, JobCard, Message, PayoutStatus } from "./bookings";

export type HirePartner = {
  id: string;
  name: string;
  province: string;
  town: string | null;
  contactName: string | null;
  contactEmail: string;
  contactPhone: string | null;
  status: "ONBOARDING" | "ACTIVE" | "SUSPENDED";
  isGroupEntity: boolean;
  latitude: number | null;
  longitude: number | null;
  payoutDetailsConfirmed: boolean;
  notes: string | null;
  users: { id: string; email: string; name: string | null }[];
  fleet: { id: string; sku: string; label: string; province: string; isActive: boolean }[];
  _count: { bookings: number };
};

export type AdminBookingRow = {
  id: string;
  reference: string;
  itemName: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  province: string;
  customerTotal: string;
  partnerAmount: string;
  createdAt: string;
  user: { email: string; name: string | null };
  assignedPartner: { id: string; name: string } | null;
  payout: { status: PayoutStatus; amount: string; releaseAfter: string | null } | null;
  disputes: { id: string }[];
};

export type AdminBooking = Omit<AdminBookingRow, "assignedPartner" | "payout" | "disputes"> & {
  sku: string;
  basis: BookingBasis;
  quantity: number;
  siteAddress: string;
  siteNotes: string | null;
  commissionPercent: string;
  quoteSource: string;
  quoteValidUntil: string | null;
  enquiryId: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  cancelledReason: string | null;
  customerRating: number | null;
  otpFailures: number;
  hasArrivalCode: boolean;
  assignedPartner: { id: string; name: string; contactEmail: string; contactPhone: string | null } | null;
  preferredPartner: { id: string; name: string } | null;
  offers: { id: string; rank: number; status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "WITHDRAWN"; offeredAt: string; expiresAt: string; respondedAt: string | null; partner: { name: string } }[];
  jobCards: JobCard[];
  messages: Message[];
  disputes: DisputeRecord[];
  payout: { id: string; status: PayoutStatus; amount: string; releaseAfter: string | null; paidAt: string | null; paidReference: string | null } | null;
};

export type AdminPayout = {
  id: string;
  amount: string;
  status: PayoutStatus;
  releaseAfter: string | null;
  paidAt: string | null;
  paidReference: string | null;
  booking: { id: string; reference: string; itemName: string };
  partner: { name: string; payoutDetailsConfirmed: boolean };
};

export type Flag = { id: string; signal: "REDACTION_HIT" | "REPEAT_PAIR_STOPPED"; detail: string; bookingId: string | null; status: string; reviewNote: string | null; createdAt: string };
