import { eligiblePaymentMethods, isMethodEligible } from "./eligibility";

const config = (methodKey: string, extra: Partial<{ tradeOnly: boolean; minOrderValue: number; maxOrderValue: number; isEnabled: boolean }> = {}) => ({
  methodKey,
  isEnabled: extra.isEnabled ?? true,
  tradeOnly: extra.tradeOnly ?? false,
  minOrderValue: extra.minOrderValue ?? null,
  maxOrderValue: extra.maxOrderValue ?? null,
});

const CONFIGS = [
  config("CARD"),
  config("INSTANT_EFT"),
  config("PAYFLEX"),
  config("SNAPSCAN", { isEnabled: false }),
  config("LULAPAY", { tradeOnly: true, minOrderValue: 10000, maxOrderValue: 5000000 }),
  config("EFT_PO", { tradeOnly: true }),
] as never[];

const keys = (r: { recommended: { methodKey: string }[]; available: { methodKey: string }[] }) => [
  ...r.recommended.map((m) => m.methodKey),
  ...r.available.map((m) => m.methodKey),
];

describe("payment eligibility", () => {
  it("never offers trade-only or disabled methods to Retail", () => {
    const result = eligiblePaymentMethods(CONFIGS, { orderTotal: 50000, customerTier: "RETAIL", isQuoteOnly: false });
    expect(keys(result)).toEqual(["CARD", "INSTANT_EFT", "PAYFLEX"]);
    expect(result.recommended.map((m: { methodKey: string }) => m.methodKey)).toEqual(["CARD", "INSTANT_EFT"]);
  });

  it("offers Lulapay to trade accounts inside its order-value band, and EFT/PO", () => {
    expect(keys(eligiblePaymentMethods(CONFIGS, { orderTotal: 9999, customerTier: "CONTRACTOR_TRADE", isQuoteOnly: false }))).not.toContain("LULAPAY");
    const inBand = keys(eligiblePaymentMethods(CONFIGS, { orderTotal: 10000, customerTier: "CONTRACTOR_TRADE", isQuoteOnly: false }));
    expect(inBand).toEqual(expect.arrayContaining(["LULAPAY", "EFT_PO"]));
  });

  it("invoices quote-only orders by EFT / purchase order only", () => {
    expect(keys(eligiblePaymentMethods(CONFIGS, { orderTotal: 250000, customerTier: "VOLUME_CIVIL_BULK", isQuoteOnly: true }))).toEqual(["EFT_PO"]);
  });

  it("rejects a method the order isn't eligible for", () => {
    expect(isMethodEligible(CONFIGS, "LULAPAY", { orderTotal: 20000, customerTier: "RETAIL", isQuoteOnly: false })).toBe(false);
    expect(isMethodEligible(CONFIGS, "SNAPSCAN", { orderTotal: 200, customerTier: "RETAIL", isQuoteOnly: false })).toBe(false);
    expect(isMethodEligible(CONFIGS, "CARD", { orderTotal: 200, customerTier: "RETAIL", isQuoteOnly: false })).toBe(true);
  });
});
