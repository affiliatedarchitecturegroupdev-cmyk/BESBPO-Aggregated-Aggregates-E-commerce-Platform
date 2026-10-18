import { dropDispatchRefusal, parseDay, planDrops, saToday } from "./phasing";

const lines = [
  { id: "l1", name: "Bricks", quantity: 18, lineTotal: 1000 },
  { id: "l2", name: "19mm stone", quantity: 10.5, lineTotal: 333.33 },
];

describe("phased deliveries", () => {
  it("numbers drops by date and shares each line's value in cents", () => {
    const drops = planDrops(
      lines,
      [
        { scheduledFor: "2026-11-20", lines: [{ lineItemId: "l1", quantity: 12 }, { lineItemId: "l2", quantity: 3.5 }] },
        { scheduledFor: "2026-11-05", lines: [{ lineItemId: "l1", quantity: 6 }, { lineItemId: "l2", quantity: 7 }] },
      ],
      "2026-10-20",
    );
    expect(drops.map((d) => [d.sequence, d.scheduledFor.toISOString().slice(0, 10)])).toEqual([[1, "2026-11-05"], [2, "2026-11-20"]]);
    expect(drops[0].value).toBeCloseTo(333.33 + 222.22, 2);
    expect(drops.reduce((n, d) => n + d.value, 0)).toBeCloseTo(1333.33, 2);
  });

  it("insists every unit is delivered exactly once, on real future dates", () => {
    const two = (q1: number, day = "2026-11-05") => [
      { scheduledFor: day, lines: [{ lineItemId: "l1", quantity: q1 }, { lineItemId: "l2", quantity: 10.5 }] },
      { scheduledFor: "2026-11-20", lines: [{ lineItemId: "l1", quantity: 6 }] },
    ];
    expect(() => planDrops(lines, two(11), "2026-10-20")).toThrow(/add up to 17, but 18 is ordered/);
    expect(() => planDrops(lines, two(12.5), "2026-10-20")).toThrow(/whole units/);
    expect(() => planDrops(lines, two(12, "2026-10-20"), "2026-10-20")).toThrow(/earliest date is tomorrow/);
    expect(() => planDrops(lines, two(12, "2027-12-01"), "2026-10-20")).toThrow(/up to a year/);
    expect(() => planDrops(lines, two(12, "2026-02-30"), "2026-10-20")).toThrow(/choose a date/);
    expect(() => planDrops(lines, [two(12)[0]], "2026-10-20")).toThrow(/at least two drops/);
    expect(() => planDrops(lines, [...two(12), { scheduledFor: "2026-12-01", lines: [{ lineItemId: "nope", quantity: 1 }] }], "2026-10-20")).toThrow(/isn't on this order/);
  });

  it("releases each drop once payments cover the fees and every drop so far", () => {
    const order = { total: 1500, amountPaid: 700, paymentPlan: "DEPOSIT" };
    const drops = [
      { id: "d1", status: "PLANNED", value: 600 },
      { id: "d2", status: "PLANNED", value: 700 },
    ];
    // Fees are 1500 - 1300 = 200, so drop 1 needs 800.
    expect(dropDispatchRefusal(order, drops, "d1")).toMatch(/^R100\.00 more must be paid/);
    expect(dropDispatchRefusal({ ...order, amountPaid: 800 }, drops, "d1")).toBeNull();
    expect(dropDispatchRefusal({ ...order, amountPaid: 800 }, [{ ...drops[0], status: "DISPATCHED" }, drops[1]], "d2")).toMatch(/R700\.00 more/);
    expect(dropDispatchRefusal({ ...order, amountPaid: 0, paymentPlan: "ACCOUNT" }, drops, "d2")).toBeNull();
  });

  it("works in South African days", () => {
    expect(saToday(new Date("2026-10-20T22:30:00Z"))).toBe("2026-10-21");
    expect(parseDay("2026-10-21")?.toISOString()).toBe("2026-10-21T00:00:00.000Z");
  });
});
