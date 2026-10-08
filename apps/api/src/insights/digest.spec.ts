import { digestDue, previousWeek, weeklyInsightsEmail, type DigestData } from "./digest";
import { cleanQuery } from "./views.service";

describe("weekly insights email", () => {
  it("covers the Monday-to-Sunday week before, in SAST", () => {
    // Wednesday 8 Oct 2026 → 28 Sep – 4 Oct
    expect(previousWeek(new Date("2026-10-08T10:00:00Z"))).toEqual({ from: "2026-09-28", to: "2026-10-04" });
    // Sunday 23:30 UTC is already Monday 01:30 in SAST → the week just ended
    expect(previousWeek(new Date("2026-10-11T23:30:00Z"))).toEqual({ from: "2026-10-05", to: "2026-10-11" });
  });

  it("is due from Monday 07:00 SAST", () => {
    expect(digestDue(new Date("2026-10-12T04:59:00Z"))).toBe(false); // Mon 06:59 SAST
    expect(digestDue(new Date("2026-10-12T05:00:00Z"))).toBe(true); // Mon 07:00 SAST
    expect(digestDue(new Date("2026-10-14T01:00:00Z"))).toBe(true); // Wednesday: catches up a missed Monday
  });

  const data: DigestData = {
    from: "2026-09-28",
    to: "2026-10-04",
    vatBasis: "AS_CHARGED",
    current: { netRevenue: 120000, materialsRevenue: 100000, deliveryRevenue: 15000, hireCommission: 5000, hireGrossValue: 46667, refunds: 0, orders: 12, bookings: 3, averageOrderValue: 9583.33, grossProfit: 30000, grossMargin: 25, operatingCosts: 20000, netProfit: 10000, linesMissingCost: 2, deliveriesMissingCost: 0, operatingCostMonthsMissing: [] },
    previous: { netRevenue: 100000, materialsRevenue: 90000, deliveryRevenue: 10000, hireCommission: 0, hireGrossValue: 0, refunds: 0, orders: 10, bookings: 0, averageOrderValue: 10000, grossProfit: 0 },
    products: [{ label: "River Sand <b>", detail: "AA-SND-01 · BULK_M3", revenue: 40000, share: 40 }],
    provinces: [{ label: "Gauteng", revenue: 70000, share: 70 }],
    pipeline: { enquiries: 4, quoteRequests: 6, quotesPriced: 5, quotesAccepted: 2, bookingsQuoted: 3 },
  };

  it("reports the week against the week before, with warnings and a link", () => {
    const m = weeklyInsightsEmail(data);
    expect(m.subject).toBe("Last week: R120,000.00 net revenue, 12 orders (28 Sep 2026 – 4 Oct 2026)");
    expect(m.text).toContain("Net revenue: R120,000.00 (▲ +20% on the week before)");
    expect(m.text).toContain("Gross profit: R30,000.00 (none the week before)");
    expect(m.text).toContain("2 order lines have no cost recorded");
    expect(m.text).toContain("/admin/insights?range=custom&from=2026-09-28&to=2026-10-04");
    expect(m.html).toContain("River Sand &lt;b&gt;"); // names are escaped
    expect(m.text).toContain("please don't forward it");
  });
});

describe("saved views", () => {
  it("keeps only known filter keys with plain values", () => {
    expect(cleanQuery("?range=90d&province=Gauteng&evil=1&tier=<script>&sort=revenue")).toBe("range=90d&province=Gauteng&sort=revenue");
  });
});
