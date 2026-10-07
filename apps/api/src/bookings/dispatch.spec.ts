import { redactContactDetails, REDACTION_MASK } from "../common/redact";
import {
  chatOpen,
  customerTotal,
  generateOtp,
  mayRevealPartner,
  offerExpiry,
  overlaps,
  payoutReleaseTime,
  rankPartners,
  reliability,
  repeatPairStopped,
  verifyOtp,
  type PartnerCandidate,
} from "./dispatch";

const fresh = { offersAnswered: 0, offersAccepted: 0, jobsAssigned: 0, jobsDisputed: 0, ratings: [] };
const c = (partnerId: string, distanceKm: number | null, extra: Partial<PartnerCandidate> = {}): PartnerCandidate => ({ partnerId, isGroupEntity: false, distanceKm, history: fresh, ...extra });

describe("dispatch rules", () => {
  it("prices the customer from the partner's quote plus commission", () => {
    expect(customerTotal(10_000, 12)).toBe(11_200);
    expect(customerTotal(1234.56, 12)).toBe(1382.71);
  });

  it("offers the quoting partner first, then nearer and more reliable partners, and drops pins beyond the radius", () => {
    const good = { offersAnswered: 10, offersAccepted: 10, jobsAssigned: 10, jobsDisputed: 0, ratings: [5, 5] };
    const poor = { offersAnswered: 10, offersAccepted: 2, jobsAssigned: 5, jobsDisputed: 3, ratings: [2] };
    const ranked = rankPartners([c("far", 140), c("near-poor", 10, { history: poor }), c("near-good", 12, { history: good }), c("outside", 200), c("unpinned", null), c("quoter", 120)], "quoter");
    expect(ranked.map((r) => r.partnerId)).toEqual(["quoter", "near-good", "near-poor", "unpinned", "far"]);
  });

  it("gives a Group company only a tie-break", () => {
    expect(rankPartners([c("a", 50), c("group", 50, { isGroupEntity: true })], null)[0].partnerId).toBe("group");
    const good = { offersAnswered: 10, offersAccepted: 10, jobsAssigned: 10, jobsDisputed: 0, ratings: [5] };
    expect(rankPartners([c("better", 20, { history: good }), c("group", 60, { isGroupEntity: true })], null)[0].partnerId).toBe("better");
  });

  it("scores new partners in the middle", () => {
    expect(reliability(fresh)).toBeCloseTo(0.525, 3);
  });

  it("checks arrival codes by hash only", () => {
    const { otp, hash } = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
    expect(hash).not.toContain(otp);
    expect(verifyOtp(otp, hash)).toBe(true);
    expect(verifyOtp(otp === "000000" ? "000001" : "000000", hash)).toBe(false);
    expect(verifyOtp("12345", hash)).toBe(false);
  });

  it("times offers and payouts", () => {
    const now = new Date("2026-10-09T08:00:00Z");
    expect(offerExpiry(now).toISOString()).toBe("2026-10-09T08:30:00.000Z");
    expect(payoutReleaseTime(now).toISOString()).toBe("2026-10-11T08:00:00.000Z");
  });

  it("names the partner and opens chat only once assigned", () => {
    expect(mayRevealPartner("DISPATCHING")).toBe(false);
    expect(mayRevealPartner("ACCEPTED")).toBe(true);
    expect(chatOpen("QUOTED")).toBe(false);
    expect(chatOpen("COMPLETED")).toBe(true);
    expect(chatOpen("CLOSED")).toBe(false);
  });

  it("treats inclusive date ranges as overlapping", () => {
    const d = (s: string) => new Date(s);
    expect(overlaps(d("2026-10-10"), d("2026-10-12"), d("2026-10-12"), d("2026-10-14"))).toBe(true);
    expect(overlaps(d("2026-10-10"), d("2026-10-12"), d("2026-10-13"), d("2026-10-14"))).toBe(false);
  });

  it("flags a pair that stopped booking", () => {
    expect(repeatPairStopped({ bookingsPrior90d: 4, bookingsLast90d: 0 })).toBe(true);
    expect(repeatPairStopped({ bookingsPrior90d: 4, bookingsLast90d: 1 })).toBe(false);
  });
});

describe("contact redaction", () => {
  it.each([
    ["Call me on 082 123 4567", "phone"],
    ["+27 (82) 123-4567 after 5", "phone"],
    ["0821234567", "phone"],
    ["mail thabo@example.co.za", "email"],
    ["thabo at example dot com", "email"],
    ["see www.myplant.co.za", "link"],
    ["https://wa.me/27821234567", "whatsapp"],
    ["DM @thabo_plant", "handle"],
  ])("removes %s", (input, label) => {
    const { text, hits } = redactContactDetails(input);
    expect(hits).toContain(label);
    expect(text).toContain(REDACTION_MASK);
    expect(text).not.toMatch(/\d{3}.?\d{4}|@example|wa\.me|myplant|thabo_plant/);
  });

  it("leaves ordinary job talk alone", () => {
    for (const msg of ["Arriving 07:30 with the 20t excavator", "We need 3 loads of G5, about 30m3", "Gate code is at the guard hut", "Booking BK-261009-A1B2C3 on 12/10/2026"]) {
      expect(redactContactDetails(msg)).toEqual({ text: msg, hits: [] });
    }
  });
});
