import { DEFAULT_DEPOSIT_POLICY, depositTerms, normalisePolicy, type DepositInput } from "./deposits";

const order = (patch: Partial<DepositInput> = {}): DepositInput => ({
  total: 50_000,
  amountPaid: 0,
  status: "PENDING",
  customerTier: "RETAIL",
  paymentPlan: "FULL",
  isExpress: false,
  hasMadeToOrder: false,
  ...patch,
});

describe("deposits", () => {
  it("asks retail for 30%, 25% from R100,000", () => {
    expect(depositTerms(order())).toEqual({ available: true, percent: 30, amount: 15_000, balance: 35_000 });
    expect(depositTerms(order({ total: 120_000 }))).toMatchObject({ percent: 25, amount: 30_000 });
  });

  it("asks trade accounts less on bigger orders, down to the 15% floor", () => {
    expect(depositTerms(order({ customerTier: "CONTRACTOR_TRADE" }))).toMatchObject({ percent: 25 });
    expect(depositTerms(order({ customerTier: "VOLUME_CIVIL_BULK", total: 180_000 }))).toMatchObject({ percent: 20 });
    expect(depositTerms(order({ customerTier: "VOLUME_CIVIL_BULK", total: 400_000 }))).toMatchObject({ percent: 15, amount: 60_000 });
  });

  it("asks 50% when anything is made to order", () => {
    expect(depositTerms(order({ customerTier: "VOLUME_CIVIL_BULK", total: 400_000, hasMadeToOrder: true }))).toMatchObject({ percent: 50 });
  });

  it("isn't offered on small, express, lay-by, already-paid or confirmed orders", () => {
    for (const patch of [{ total: 9_999 }, { isExpress: true }, { paymentPlan: "LAYBY" }, { amountPaid: 100 }, { status: "CONFIRMED" }]) {
      expect(depositTerms(order(patch)).available).toBe(false);
    }
  });

  it("keeps an admin's policy inside the 15–50% band", () => {
    const p = normalisePolicy({ retail: [{ fromTotal: 0, percent: 5 }], madeToOrderPercent: 90, ceilingPercent: 70 });
    expect(p.retail[0].percent).toBe(15);
    expect(p.madeToOrderPercent).toBe(50);
    expect(p.ceilingPercent).toBe(50);
    expect(normalisePolicy(null)).toEqual(DEFAULT_DEPOSIT_POLICY);
  });
});
