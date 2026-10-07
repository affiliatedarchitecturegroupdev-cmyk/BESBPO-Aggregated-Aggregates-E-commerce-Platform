import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Pure booking and dispatch rules (no Nest or Prisma), so they are unit
 * tested on their own. Agent model: we broker the job between customer and
 * partner and earn a fixed commission (PLANT_HIRE_CATALOGUE.md).
 */
export const OFFER_WINDOW_MINUTES = 30;
export const DISPUTE_WINDOW_HOURS = 48;
export const MAX_RADIUS_KM = 150;
export const MAX_OTP_FAILURES = 5;

export type PartnerHistory = {
  offersAnswered: number; // accepted + declined + expired
  offersAccepted: number;
  jobsAssigned: number;
  jobsDisputed: number;
  ratings: number[]; // customer ratings 1–5
};

export type PartnerCandidate = {
  partnerId: string;
  isGroupEntity: boolean;
  /** straight-line km from the site; null when either side has no map pin */
  distanceKm: number | null;
  history: PartnerHistory;
};

/** 0–1 reliability from the partner's record on the platform; new partners start in the middle. */
export function reliability(h: PartnerHistory): number {
  const acceptance = h.offersAnswered ? h.offersAccepted / h.offersAnswered : 0.5;
  const disputeFree = h.jobsAssigned ? 1 - h.jobsDisputed / h.jobsAssigned : 0.5;
  const rating = h.ratings.length ? h.ratings.reduce((a, b) => a + b, 0) / h.ratings.length / 5 : 0.6;
  return Math.max(0, Math.min(1, 0.45 * acceptance + 0.3 * disputeFree + 0.25 * rating));
}

/**
 * Order partners for the offer cascade. The partner whose written quote
 * priced the booking goes first (it's their price); the rest are ranked by
 * proximity and reliability, with a small tie-break for Group companies so
 * day-one supply is used — never ahead of a clearly better partner.
 * Partners pinned beyond the radius are left out; unpinned ones stay in
 * with a neutral proximity score (pins are never guessed).
 */
export function rankPartners(candidates: PartnerCandidate[], preferredPartnerId: string | null, maxRadiusKm = MAX_RADIUS_KM): PartnerCandidate[] {
  const eligible = candidates.filter((c) => c.distanceKm === null || c.distanceKm <= maxRadiusKm);
  const score = (c: PartnerCandidate) => {
    const proximity = c.distanceKm === null ? 0.4 : 1 - c.distanceKm / maxRadiusKm;
    return 0.45 * proximity + 0.5 * reliability(c.history) + (c.isGroupEntity ? 0.05 : 0);
  };
  return [...eligible].sort((a, b) => {
    if (a.partnerId === preferredPartnerId) return -1;
    if (b.partnerId === preferredPartnerId) return 1;
    return score(b) - score(a) || a.partnerId.localeCompare(b.partnerId);
  });
}

export function offerExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + OFFER_WINDOW_MINUTES * 60_000);
}

/** Customer price from the partner's written quote: partner amount plus our commission, to the cent. */
export function customerTotal(partnerAmount: number, commissionPercent: number): number {
  return Math.round(partnerAmount * (100 + commissionPercent)) / 100;
}

/** 6-digit arrival code; only its hash is stored. The customer reads it to the operator on site. */
export function generateOtp(): { otp: string; hash: string } {
  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  return { otp, hash: hashOtp(otp) };
}

export function hashOtp(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

export function verifyOtp(otp: string, storedHash: string): boolean {
  if (!/^\d{6}$/.test(otp)) return false;
  const a = Buffer.from(hashOtp(otp), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function payoutReleaseTime(signedOffAt: Date): Date {
  return new Date(signedOffAt.getTime() + DISPUTE_WINDOW_HOURS * 3_600_000);
}

/** Statuses in which the customer sees the partner's name (never their contact details). */
export function mayRevealPartner(status: string): boolean {
  return ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED", "DISPUTED"].includes(status);
}

/** Chat is open once a partner is assigned, and stays open through the dispute window. */
export function chatOpen(status: string): boolean {
  return ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "DISPUTED"].includes(status);
}

/** Inclusive date ranges overlap. */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();
}

export function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export type PairHistory = { bookingsLast90d: number; bookingsPrior90d: number };

/** A customer–partner pair that booked repeatedly and then stopped: a review signal, never a penalty. */
export function repeatPairStopped(h: PairHistory, minPrior = 3): boolean {
  return h.bookingsPrior90d >= minPrior && h.bookingsLast90d === 0;
}
