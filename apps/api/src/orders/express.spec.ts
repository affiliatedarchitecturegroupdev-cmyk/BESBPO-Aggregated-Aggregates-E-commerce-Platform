import { EXPRESS, estimatedLoadKg, expressClock, expressOutcome, expressQuote, isWithinHours, qualifies, type ExpressLine } from "./express";
import { eligiblePaymentMethods } from "../payment-gateway/eligibility";

// Wednesday 14 October 2026 — times are SAST (UTC+2).
const at = (iso: string) => new Date(`${iso}+02:00`);
const OPEN = at("2026-10-14T10:00:00");

const cement: ExpressLine = { sku: "AA-CEM-425N-001", categorySlug: "cement-hydraulic-binders", unit: "BAG_50KG", quantity: 20, equivalentTons: 1 };
const near = { distanceKm: 12, source: "LOCATION" as const };

describe("AA 60/120 — what qualifies", () => {
  it.each<[string, Partial<ExpressLine>, boolean]>([
    ["cement bags", { categorySlug: "cement-hydraulic-binders", unit: "BAG_50KG" }, true],
    ["bulk cement", { categorySlug: "cement-hydraulic-binders", unit: "BULK_TANKER_PER_TON" }, false],
    ["bagged sand", { categorySlug: "sand-fine-aggregates", unit: "bag" }, true],
    ["bulk sand", { categorySlug: "sand-fine-aggregates", unit: "m3" }, false],
    ["bricks", { categorySlug: "bricks-blocks", unit: "THOUSAND", sku: "AA-MAS-CLAY-STOCK" }, true],
    ["lintels", { categorySlug: "lintels-dpc-wall-accessories", unit: "EACH", sku: "AA-MAS-LINTEL-2400" }, true],
    ["DPC", { categorySlug: "lintels-dpc-wall-accessories", unit: "ROLL" }, true],
    ["6 m rebar", { categorySlug: "reinforcing-bar", unit: "LENGTH_6M" }, true],
    ["12 m rebar", { categorySlug: "reinforcing-bar", unit: "LENGTH_12M" }, false],
    ["rebar by the tonne", { categorySlug: "reinforcing-bar", unit: "TONNE" }, false],
    ["brickforce", { categorySlug: "mesh-brickforce", unit: "ROLL" }, true],
    ["mesh sheets", { categorySlug: "mesh-brickforce", unit: "SHEET" }, false],
    ["structural steel", { categorySlug: "structural-steel", unit: "LENGTH_6M" }, false],
    ["standard roof sheets", { categorySlug: "roof-sheeting", unit: "SHEET_6_6M" }, true],
    ["cut-to-length sheet", { categorySlug: "roof-sheeting", unit: "METRE" }, false],
    ["roof tiles", { categorySlug: "concrete-roof-tiles", unit: "EACH" }, true],
    ["timber", { categorySlug: "structural-timber", unit: "TIMBER_6_6M" }, false],
    ["ready-mix", { categorySlug: "ready-mix-concrete", unit: "m3" }, false],
  ])("%s", (_name, line, expected) => {
    expect(qualifies({ sku: "X", quantity: 1, ...line } as ExpressLine)).toBe(expected);
  });
});

describe("AA 60/120 — load", () => {
  it("uses the priced mass where there is one, else a conservative unit weight", () => {
    expect(estimatedLoadKg([cement])).toBe(1000);
    expect(estimatedLoadKg([{ sku: "AA-MAS-LINTEL-3000", categorySlug: "lintels-dpc-wall-accessories", unit: "EACH", quantity: 10 }])).toBe(600);
    expect(estimatedLoadKg([{ sku: "AA-MAS-CLAY-MAXI", categorySlug: "bricks-blocks", unit: "THOUSAND", quantity: 1 }])).toBe(5000);
  });
});

describe("AA 60/120 — hours", () => {
  it("takes orders Monday to Saturday from 07:00 until the 15:00 cut-off", () => {
    expect(isWithinHours(at("2026-10-14T06:59:00"))).toBe(false);
    expect(isWithinHours(at("2026-10-14T07:00:00"))).toBe(true);
    expect(isWithinHours(at("2026-10-14T14:59:00"))).toBe(true);
    expect(isWithinHours(at("2026-10-14T15:00:00"))).toBe(false);
    expect(isWithinHours(at("2026-10-17T10:00:00"))).toBe(true); // Saturday
    expect(isWithinHours(at("2026-10-18T10:00:00"))).toBe(false); // Sunday
  });
});

describe("AA 60/120 — eligibility", () => {
  it("is available for a qualifying, priced cart within 30 km in hours", () => {
    const q = expressQuote({ lines: [cement], distance: near, isQuoteOnly: false, now: OPEN });
    expect(q).toMatchObject({ available: true, reasons: [], fee: 1000, estimatedLoadKg: 1000 });
  });

  it("explains each reason it isn't", () => {
    const q = expressQuote({
      lines: [cement, { sku: "AA-TMB-1", name: "SA Pine 38 × 114", categorySlug: "structural-timber", unit: "TIMBER_6_6M", quantity: 10 }],
      distance: { distanceKm: 31, source: "LOCATION" },
      isQuoteOnly: true,
      now: at("2026-10-14T15:30:00"),
    });
    expect(q.available).toBe(false);
    expect(q.reasons.join(" ")).toMatch(/SA Pine 38 × 114 isn't on AA 60\/120/);
    expect(q.reasons.join(" ")).toMatch(/needs a quote/);
    expect(q.reasons.join(" ")).toMatch(/about 31 km/);
    expect(q.reasons.join(" ")).toMatch(/15:00 cut-off/);
  });

  it("needs the buyer's pin, not a typed distance", () => {
    expect(expressQuote({ lines: [cement], distance: { distanceKm: 5, source: "CUSTOMER" }, isQuoteOnly: false, now: OPEN }).available).toBe(false);
  });

  it("caps the load at one truck", () => {
    const q = expressQuote({ lines: [{ ...cement, quantity: 120, equivalentTons: 6 }], distance: near, isQuoteOnly: false, now: OPEN });
    expect(q.available).toBe(false);
    expect(q.reasons[0]).toMatch(/6\.0 t/);
  });
});

describe("AA 60/120 — the clock", () => {
  const accepted = at("2026-10-14T10:00:00");
  const paid = { status: "CONFIRMED", expressFee: 1000, expressAcceptedAt: accepted, expressDeclinedAt: null };

  it("starts after 20 minutes' prep, is due 120 minutes later, refundable after 180", () => {
    const c = expressClock(accepted);
    expect(c.clockStartsAt).toEqual(at("2026-10-14T10:20:00"));
    expect(c.dueAt).toEqual(at("2026-10-14T12:20:00"));
    expect(c.refundAfter).toEqual(at("2026-10-14T13:20:00"));
  });

  it("refunds the fee only when more than an hour late", () => {
    const delivered = { ...paid, status: "DELIVERED" };
    expect(expressOutcome(delivered, at("2026-10-14T12:20:00"), OPEN)).toBe("ON_TIME");
    expect(expressOutcome(delivered, at("2026-10-14T13:20:00"), OPEN)).toBe("LATE");
    expect(expressOutcome(delivered, at("2026-10-14T13:21:00"), OPEN)).toBe("REFUND_DUE");
  });

  it("tracks orders before and during delivery", () => {
    expect(expressOutcome({ ...paid, expressFee: null }, null, OPEN)).toBeNull();
    expect(expressOutcome({ ...paid, status: "PENDING", expressAcceptedAt: null }, null, OPEN)).toBe("AWAITING_PAYMENT");
    expect(expressOutcome({ ...paid, expressAcceptedAt: null }, null, OPEN)).toBe("AWAITING_ACCEPTANCE");
    expect(expressOutcome({ ...paid, status: "IN_TRANSIT" }, null, at("2026-10-14T13:00:00"))).toBe("IN_PROGRESS");
    expect(expressOutcome({ ...paid, status: "IN_TRANSIT" }, null, at("2026-10-14T13:30:00"))).toBe("REFUND_DUE");
    expect(expressOutcome({ ...paid, expressDeclinedAt: OPEN }, null, OPEN)).toBe("DECLINED");
  });

  it("is a single truck and a 30 km radius", () => {
    expect(EXPRESS).toMatchObject({ radiusKm: 30, maxLoadKg: 5000, feeRand: 1000 });
  });
});

describe("AA 60/120 — payment", () => {
  const config = (methodKey: string, activeGateway: string) => ({ methodKey, activeGateway, isEnabled: true, tradeOnly: false, minOrderValue: null, maxOrderValue: null });
  const configs = [config("CARD", "PEACH"), config("INSTANT_EFT", "PAYFAST"), config("EFT_PO", "MANUAL"), config("OZOW", "OZOW"), config("SCODE", "PAYFAST")] as never[];

  it("allows only Card and PayFast methods paid on the spot", () => {
    const r = eligiblePaymentMethods(configs, { orderTotal: 5000, customerTier: "RETAIL", isQuoteOnly: false, isExpress: true });
    expect([...r.recommended, ...r.available].map((m: { methodKey: string }) => m.methodKey).sort()).toEqual(["CARD", "INSTANT_EFT"]);
  });
});
