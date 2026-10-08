import { autoGranularity, bucketKeys, change, comparisonPeriod, defaultPeriod, period, todaySast, vatBasis } from "./period";

describe("insights periods", () => {
  it("runs SAST midnight to midnight, as UTC instants", () => {
    const p = period("2026-10-01", "2026-10-31");
    expect(p.start.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-10-31T22:00:00.000Z");
    expect(p.days).toBe(31);
    expect(() => period("2026-10-05", "2026-10-01")).toThrow();
  });

  it("knows today's date in South Africa", () => {
    expect(todaySast(new Date("2026-10-08T22:30:00Z"))).toBe("2026-10-09");
    const d = defaultPeriod(new Date("2026-10-08T10:00:00Z"));
    expect([d.from, d.to, d.days]).toEqual(["2026-09-09", "2026-10-08", 30]);
  });

  it("compares with the period before or the same dates last year", () => {
    const p = period("2026-10-01", "2026-10-31");
    const prev = comparisonPeriod(p, "previous")!;
    expect([prev.from, prev.to, prev.days]).toEqual(["2026-08-31", "2026-09-30", 31]);
    const year = comparisonPeriod(p, "year")!;
    expect([year.from, year.to]).toEqual(["2025-10-01", "2025-10-31"]);
    expect(comparisonPeriod(period("2028-02-01", "2028-02-29"), "year")!.to).toBe("2027-02-28");
    expect(comparisonPeriod(p, "none")).toBeNull();
  });

  it("picks a sensible bucket size and lists every bucket", () => {
    expect(autoGranularity(period("2026-10-01", "2026-10-31"))).toBe("day");
    expect(autoGranularity(period("2026-04-01", "2026-10-31"))).toBe("week");
    expect(autoGranularity(period("2025-10-01", "2026-10-31"))).toBe("month");
    expect(bucketKeys(period("2026-10-01", "2026-10-03"), "day")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    // 1 Oct 2026 is a Thursday: its week starts Monday 28 Sep.
    expect(bucketKeys(period("2026-10-01", "2026-10-12"), "week")).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(bucketKeys(period("2026-08-15", "2026-10-02"), "month")).toEqual(["2026-08-01", "2026-09-01", "2026-10-01"]);
  });

  it("reports ex VAT only once prices are confirmed VAT-inclusive", () => {
    expect(vatBasis("true")).toEqual({ basis: "EX_VAT", divisor: 1.15 });
    expect(vatBasis(undefined)).toEqual({ basis: "AS_CHARGED", divisor: 1 });
    expect(vatBasis("false")).toEqual({ basis: "AS_CHARGED", divisor: 1 });
  });

  it("works out percentage change", () => {
    expect(change(150, 100)).toBe(50);
    expect(change(50, 100)).toBe(-50);
    expect(change(10, 0)).toBeNull();
    expect(change(10, null)).toBeNull();
  });
});
