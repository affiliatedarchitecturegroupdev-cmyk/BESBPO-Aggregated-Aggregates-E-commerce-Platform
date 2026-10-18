import { accountDueDate, chargeRefusal, creditPosition } from "./credit";

const now = new Date("2026-10-20T10:00:00Z");
const approved = { creditStatus: "APPROVED", creditLimit: "100000.00", paymentTermsDays: 30 };

describe("trade credit", () => {
  it("adds up what's owed on account, what's overdue and what's left", () => {
    const position = creditPosition(
      approved,
      [
        { total: "40000", amountPaid: "10000", accountDueAt: new Date("2026-11-01T00:00:00Z"), status: "DELIVERED" },
        { total: "20000", amountPaid: "0", accountDueAt: new Date("2026-10-01T00:00:00Z"), status: "IN_TRANSIT" },
        { total: "5000", amountPaid: "5000", accountDueAt: new Date("2026-09-01T00:00:00Z"), status: "DELIVERED" }, // paid off
        { total: "9999", amountPaid: "0", accountDueAt: new Date("2026-09-01T00:00:00Z"), status: "CANCELLED" },
      ],
      now,
    );
    expect(position).toEqual({ status: "APPROVED", limit: 100000, termsDays: 30, used: 50000, overdue: 20000, overdueOrders: 1, available: 50000 });
  });

  it("refuses an overdue account, an amount over the limit, and accounts that aren't open", () => {
    const clean = creditPosition(approved, [], now);
    expect(chargeRefusal(clean, 100000)).toBeNull();
    expect(chargeRefusal(clean, 100000.5)).toMatch(/more than the R100000\.00 available/);
    const overdue = creditPosition(approved, [{ total: "100", amountPaid: "0", accountDueAt: new Date("2026-10-19T00:00:00Z"), status: "DELIVERED" }], now);
    expect(chargeRefusal(overdue, 10)).toMatch(/overdue \(R100\.00\)/);
    for (const status of ["NONE", "APPLIED", "DECLINED", "SUSPENDED"]) {
      const p = creditPosition({ ...approved, creditStatus: status }, [], now);
      expect(p.limit).toBe(0);
      expect(chargeRefusal(p, 1)).toMatch(/approved trade account/);
    }
  });

  it("dates payment from confirmation plus the terms", () => {
    expect(accountDueDate(now, 30).toISOString()).toBe("2026-11-19T10:00:00.000Z");
  });
});
