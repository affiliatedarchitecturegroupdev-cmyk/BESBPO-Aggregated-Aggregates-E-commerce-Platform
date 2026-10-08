import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import type { BreakdownBy, BreakdownQuery, InsightsQuery, PnlQuery } from "./insights.dto";
import { autoGranularity, bucketKeys, change, comparisonPeriod, defaultPeriod, period, round2, todaySast, vatBasis, type Granularity, type Period } from "./period";

/**
 * The analytics engine behind Admin → Insights (ANALYTICS.md, Phase 2).
 *
 * Rules, applied everywhere:
 * - A material sale counts on the day its payment was confirmed (Order.paidAt);
 *   refunds are deducted on the day they were paid back. A paid order that is
 *   later cancelled stays in revenue until its refund is recorded, so nothing
 *   is counted twice.
 * - Hire bookings count on the day they were paid, at gross booking value and
 *   at our commission (Agent model); cancelled bookings are left out and their
 *   refunds are a pass-through, reported but not deducted from commission.
 * - Test orders and bookings are excluded.
 * - Amounts are ex VAT once prices are confirmed VAT-inclusive (PRICES_INCLUDE_VAT),
 *   otherwise as charged — the response's vatBasis says which. Delivery costs
 *   and operating costs are entered ex VAT already.
 * - Product filters (family, category, sku) work on order lines, so delivery
 *   fees, delivery costs and refunds — which belong to whole orders — are left
 *   out of a product-filtered view, and so is hire. Operating costs only appear
 *   in an unfiltered view.
 * - Cost, profit and operating costs are admin-only: `ADMIN_ONLY_KEYS` are
 *   removed for everyone else by the controller.
 */
export const ADMIN_ONLY_KEYS = [
  "cogs",
  "deliveryCost",
  "grossProfit",
  "grossMargin",
  "operatingCosts",
  "netProfit",
  "operatingCostsByCategory",
  "operatingCostMonthsMissing",
  "operatingCostsRecorded",
  "partnerPayouts",
  "linesMissingCost",
  "linesEstimated",
  "deliveriesMissingCost",
] as const;

type Metrics = {
  materialsRevenue: number;
  deliveryRevenue: number;
  hireGrossValue: number;
  hireCommission: number;
  refunds: number;
  hireRefunds: number;
  netRevenue: number;
  orders: number;
  orderLines: number;
  bookings: number;
  averageOrderValue: number;
  cogs: number;
  deliveryCost: number;
  grossProfit: number;
  grossMargin: number | null;
  linesMissingCost: number;
  linesEstimated: number;
  deliveriesMissingCost: number;
};

type Scope = { materials: boolean; delivery: boolean; hire: boolean; opex: boolean; lineFiltered: boolean };

const emptyMetrics = (): Metrics => ({
  materialsRevenue: 0,
  deliveryRevenue: 0,
  hireGrossValue: 0,
  hireCommission: 0,
  refunds: 0,
  hireRefunds: 0,
  netRevenue: 0,
  orders: 0,
  orderLines: 0,
  bookings: 0,
  averageOrderValue: 0,
  cogs: 0,
  deliveryCost: 0,
  grossProfit: 0,
  grossMargin: null,
  linesMissingCost: 0,
  linesEstimated: 0,
  deliveriesMissingCost: 0,
});

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const TOTAL = "total";

/** Group expressions for breakdowns — fixed SQL, never built from user input. */
const GROUPS: Record<BreakdownBy, { key: string; label: string; extra?: string; join?: string }> = {
  product: { key: `p.id || ':' || li."unitOfSale"::text`, label: "p.name", extra: `p.sku || ' · ' || li."unitOfSale"::text` },
  category: { key: "c.slug", label: "c.name" },
  family: { key: `COALESCE(li."pricingFamily", 'UNKNOWN')`, label: `COALESCE(li."pricingFamily", 'Not recorded')` },
  province: { key: `COALESCE(o."deliveryProvince", 'Unknown')`, label: `COALESCE(o."deliveryProvince", 'Unknown')` },
  tier: { key: `COALESCE(o."customerTier"::text, 'UNKNOWN')`, label: `COALESCE(o."customerTier"::text, 'Not recorded')` },
  channel: { key: `o.channel::text`, label: `o.channel::text` },
  paymentMethod: { key: `COALESCE(o."paymentMethod"::text, 'UNKNOWN')`, label: `COALESCE(o."paymentMethod"::text, 'Not recorded')` },
  supplier: { key: `COALESCE(sl.id, 'none')`, label: `COALESCE(sl.name, 'Not recorded')`, join: `LEFT JOIN "SupplierLocation" sl ON sl.id = o."fulfilledBySupplierId"` },
  customer: {
    key: `COALESCE(o."companyId", o."userId", 'guest')`,
    label: `COALESCE(co.name, u.name, u.email, 'Guest')`,
    extra: `CASE WHEN o."companyId" IS NOT NULL THEN 'Trade account' ELSE 'Individual' END`,
    join: `LEFT JOIN "Company" co ON co.id = o."companyId" LEFT JOIN "User" u ON u.id = o."userId"`,
  },
};

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // Public endpoints
  // -------------------------------------------------------------------------

  /** Headline figures for the period, the comparison period, and the change. */
  async summary(q: InsightsQuery) {
    const { p, prev, scope } = this.context(q);
    const [current, previous, opexNow, opexPrev, pipeline] = await Promise.all([
      this.metrics(q, p, null, scope).then((m) => m.get(TOTAL)!),
      prev ? this.metrics(q, prev, null, scope).then((m) => m.get(TOTAL)!) : null,
      scope.opex ? this.operatingCosts(p) : null,
      scope.opex && prev ? this.operatingCosts(prev) : null,
      this.pipelineCounts(p),
    ]);
    const withNet = (m: Metrics, opex: Awaited<ReturnType<InsightsService["operatingCosts"]>> | null) => ({
      ...m,
      operatingCosts: opex ? opex.total : null,
      operatingCostsByCategory: opex ? opex.byCategory : null,
      netProfit: opex ? round2(m.grossProfit - opex.total) : null,
      operatingCostMonthsMissing: opex ? opex.monthsMissing : null,
    });
    const cur = withNet(current, opexNow);
    const pre = previous ? withNet(previous, opexPrev) : null;
    const changes = Object.fromEntries(
      (["materialsRevenue", "deliveryRevenue", "hireCommission", "hireGrossValue", "netRevenue", "orders", "bookings", "averageOrderValue", "grossProfit", "netProfit"] as const).map((k) => [
        k,
        pre ? change(Number(cur[k] ?? 0), pre[k] === null ? null : Number(pre[k])) : null,
      ]),
    );
    return { ...this.meta(q, p, prev, scope), current: cur, previous: pre, change: changes, pipeline };
  }

  /** The same metrics per day, week or month, with the comparison period aligned bucket by bucket. */
  async timeseries(q: InsightsQuery) {
    const { p, prev, scope } = this.context(q);
    const g: Granularity = q.granularity ?? autoGranularity(p);
    const [cur, pre] = await Promise.all([this.metrics(q, p, g, scope), prev ? this.metrics(q, prev, g, scope) : null]);
    const keys = bucketKeys(p, g);
    const prevKeys = prev ? bucketKeys(prev, g) : [];
    return {
      ...this.meta(q, p, prev, scope),
      granularity: g,
      buckets: keys.map((key, i) => ({
        key,
        current: cur.get(key) ?? emptyMetrics(),
        previousKey: prevKeys[i] ?? null,
        previous: pre && prevKeys[i] ? (pre.get(prevKeys[i]) ?? emptyMetrics()) : null,
      })),
    };
  }

  /** Material sales grouped by product, category, family, province, tier, channel, payment method, supplier or customer. */
  async breakdown(q: BreakdownQuery) {
    const { p, prev, scope } = this.context(q);
    if (!scope.materials) return { ...this.meta(q, p, prev, scope), by: q.by, total: 0, rows: [] };
    const [rows, previous] = await Promise.all([this.groupRows(q, p, q.by), prev ? this.groupRows(q, prev, q.by) : null]);
    const total = rows.reduce((n, r) => n + r.revenue, 0);
    const prevBy = new Map((previous ?? []).map((r) => [r.key, r.revenue]));
    const enriched = rows.map((r) => ({
      ...r,
      share: total ? round2((r.revenue / total) * 100) : 0,
      previousRevenue: previous ? round2(prevBy.get(r.key) ?? 0) : null,
      growth: previous ? change(r.revenue, prevBy.get(r.key) ?? 0) : null,
    }));
    const sort = q.sort ?? "revenue";
    enriched.sort((a, b) => {
      const v = (r: (typeof enriched)[number]) => (sort === "grossProfit" ? r.grossProfit : sort === "orders" ? r.orders : sort === "growth" ? (r.growth ?? -Infinity) : r.revenue);
      return v(b) - v(a) || b.revenue - a.revenue;
    });
    return { ...this.meta(q, p, prev, scope), by: q.by, sort, total: round2(total), rows: enriched.slice(0, q.limit ?? 50) };
  }

  /** Admin: the monthly management P&L — whole business, so filters don't apply. */
  async pnl(q: PnlQuery) {
    const months = q.months ?? 12;
    const lastDay = q.to ?? todaySast();
    const [y, m] = lastDay.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1 - (months - 1), 1));
    const last = new Date(Date.UTC(y, m, 0));
    const p = period(first.toISOString().slice(0, 10), last.toISOString().slice(0, 10));
    const unfiltered: InsightsQuery = {};
    const scope = this.scope(unfiltered);
    const [series, opexRows] = await Promise.all([
      this.metrics(unfiltered, p, "month", scope),
      this.prisma.operatingCost.findMany({ where: { month: { gte: first, lte: last } }, select: { month: true, category: true, amountExVat: true } }),
    ]);
    const rows = bucketKeys(p, "month").map((key) => {
      const mt = series.get(key) ?? emptyMetrics();
      const opex = opexRows.filter((r) => r.month.toISOString().slice(0, 10) === key);
      const byCategory: Record<string, number> = {};
      for (const r of opex) byCategory[r.category] = round2((byCategory[r.category] ?? 0) + Number(r.amountExVat));
      const operatingCosts = round2(opex.reduce((n, r) => n + Number(r.amountExVat), 0));
      return {
        month: key.slice(0, 7),
        materialsRevenue: mt.materialsRevenue,
        deliveryRevenue: mt.deliveryRevenue,
        hireCommission: mt.hireCommission,
        refunds: mt.refunds,
        netRevenue: mt.netRevenue,
        cogs: mt.cogs,
        deliveryCost: mt.deliveryCost,
        grossProfit: mt.grossProfit,
        grossMargin: mt.grossMargin,
        operatingCosts,
        operatingCostsByCategory: byCategory,
        netProfit: round2(mt.grossProfit - operatingCosts),
        operatingCostsRecorded: opex.length > 0,
        orders: mt.orders,
        bookings: mt.bookings,
        hireGrossValue: mt.hireGrossValue,
        hireRefunds: mt.hireRefunds,
        linesMissingCost: mt.linesMissingCost,
        linesEstimated: mt.linesEstimated,
        deliveriesMissingCost: mt.deliveriesMissingCost,
      };
    });
    const sum = (k: keyof (typeof rows)[number]) => round2(rows.reduce((n, r) => n + Number(r[k] ?? 0), 0));
    const totals = {
      materialsRevenue: sum("materialsRevenue"),
      deliveryRevenue: sum("deliveryRevenue"),
      hireCommission: sum("hireCommission"),
      refunds: sum("refunds"),
      netRevenue: sum("netRevenue"),
      cogs: sum("cogs"),
      deliveryCost: sum("deliveryCost"),
      grossProfit: sum("grossProfit"),
      operatingCosts: sum("operatingCosts"),
      netProfit: sum("netProfit"),
    };
    return { vatBasis: vatBasis().basis, from: p.from, to: p.to, months: rows, totals: { ...totals, grossMargin: totals.netRevenue ? round2((totals.grossProfit / totals.netRevenue) * 100) : null } };
  }

  /** Hire & services: the booking funnel, value, fill rate, items, provinces and partner league. */
  async hire(q: InsightsQuery) {
    const { p, prev } = this.context(q);
    const province = q.province ? Prisma.sql`AND b.province = ${q.province}` : Prisma.empty;
    const { divisor } = vatBasis();
    const [created, paid, prevPaid, items, provinces, partners, offers, payouts] = await Promise.all([
      this.prisma.$queryRaw<{ status: string; n: bigint }[]>`
        SELECT b.status::text AS status, COUNT(*) AS n FROM "Booking" b
        WHERE b."isTest" = false AND b."createdAt" >= ${p.start} AND b."createdAt" < ${p.end} ${province}
        GROUP BY 1`,
      this.paidBookings(p, province),
      prev ? this.paidBookings(prev, province) : null,
      this.prisma.$queryRaw<{ sku: string; name: string; n: bigint; gbv: unknown; commission: unknown }[]>`
        SELECT b.sku, b."itemName" AS name, COUNT(*) AS n, SUM(b."customerTotal") AS gbv, SUM(b."customerTotal" - b."partnerAmount") AS commission
        FROM "Booking" b
        WHERE b."isTest" = false AND b."paidAt" >= ${p.start} AND b."paidAt" < ${p.end} AND b.status::text <> 'CANCELLED' ${province}
        GROUP BY 1, 2 ORDER BY gbv DESC LIMIT 20`,
      this.prisma.$queryRaw<{ province: string; n: bigint; gbv: unknown; commission: unknown }[]>`
        SELECT b.province, COUNT(*) AS n, SUM(b."customerTotal") AS gbv, SUM(b."customerTotal" - b."partnerAmount") AS commission
        FROM "Booking" b
        WHERE b."isTest" = false AND b."paidAt" >= ${p.start} AND b."paidAt" < ${p.end} AND b.status::text <> 'CANCELLED' ${province}
        GROUP BY 1 ORDER BY gbv DESC`,
      this.prisma.$queryRaw<{ id: string; name: string; jobs: bigint; completed: bigint; disputed: bigint; rating: unknown; payouts: unknown }[]>`
        SELECT h.id, h.name, COUNT(b.id) AS jobs,
          COUNT(b.id) FILTER (WHERE b.status::text IN ('COMPLETED', 'CLOSED')) AS completed,
          COUNT(DISTINCT d."bookingId") AS disputed,
          AVG(b."customerRating") AS rating,
          SUM(b."partnerAmount") AS payouts
        FROM "Booking" b JOIN "HirePartner" h ON h.id = b."assignedPartnerId"
        LEFT JOIN "Dispute" d ON d."bookingId" = b.id
        WHERE b."isTest" = false AND b."assignedAt" >= ${p.start} AND b."assignedAt" < ${p.end} ${province}
        GROUP BY 1, 2 ORDER BY jobs DESC LIMIT 50`,
      this.prisma.$queryRaw<{ id: string; answered: bigint; accepted: bigint; minutes: unknown }[]>`
        SELECT o."partnerId" AS id,
          COUNT(*) FILTER (WHERE o.status::text IN ('ACCEPTED', 'DECLINED', 'EXPIRED')) AS answered,
          COUNT(*) FILTER (WHERE o.status::text = 'ACCEPTED') AS accepted,
          AVG(EXTRACT(EPOCH FROM (o."respondedAt" - o."offeredAt")) / 60) FILTER (WHERE o.status::text = 'ACCEPTED') AS minutes
        FROM "DispatchOffer" o JOIN "Booking" b ON b.id = o."bookingId"
        WHERE b."isTest" = false AND o."offeredAt" >= ${p.start} AND o."offeredAt" < ${p.end} ${province}
        GROUP BY 1`,
      this.prisma.partnerPayout.groupBy({ by: ["status"], where: { status: { in: ["HELD", "DUE"] }, booking: { isTest: false } }, _sum: { amount: true }, _count: { _all: true } }),
    ]);
    const offerBy = new Map(offers.map((o) => [o.id, o]));
    const allOffers = offers.reduce((n, o) => ({ answered: n.answered + num(o.answered), accepted: n.accepted + num(o.accepted) }), { answered: 0, accepted: 0 });
    return {
      ...this.meta(q, p, prev, this.scope(q)),
      createdByStatus: Object.fromEntries(created.map((r) => [r.status, num(r.n)])),
      paid: paid,
      previousPaid: prevPaid,
      change: prevPaid ? { hireGrossValue: change(paid.hireGrossValue, prevPaid.hireGrossValue), hireCommission: change(paid.hireCommission, prevPaid.hireCommission), bookings: change(paid.bookings, prevPaid.bookings) } : null,
      offerAcceptanceRate: allOffers.answered ? round2((allOffers.accepted / allOffers.answered) * 100) : null,
      items: items.map((r) => ({ sku: r.sku, name: r.name, bookings: num(r.n), hireGrossValue: round2(num(r.gbv) / divisor), hireCommission: round2(num(r.commission) / divisor) })),
      provinces: provinces.map((r) => ({ province: r.province, bookings: num(r.n), hireGrossValue: round2(num(r.gbv) / divisor), hireCommission: round2(num(r.commission) / divisor) })),
      partners: partners.map((r) => {
        const o = offerBy.get(r.id);
        return {
          id: r.id,
          name: r.name,
          jobs: num(r.jobs),
          completed: num(r.completed),
          disputed: num(r.disputed),
          averageRating: r.rating === null ? null : round2(num(r.rating)),
          acceptanceRate: o && num(o.answered) ? round2((num(o.accepted) / num(o.answered)) * 100) : null,
          averageMinutesToAccept: o?.minutes == null ? null : round2(num(o.minutes)),
          partnerPayouts: round2(num(r.payouts)),
        };
      }),
      partnerPayouts: {
        held: round2(num(payouts.find((r) => r.status === "HELD")?._sum.amount)),
        due: round2(num(payouts.find((r) => r.status === "DUE")?._sum.amount)),
      },
    };
  }

  /** From enquiry to quote to sale: counts, win rate and speed. */
  async pipeline(q: InsightsQuery) {
    const { p, prev } = this.context(q);
    const [enquiries, quotes, quoteSpeed, bookings, current, previous] = await Promise.all([
      this.prisma.$queryRaw<{ kind: string; status: string; n: bigint }[]>`
        SELECT kind::text AS kind, status::text AS status, COUNT(*) AS n FROM "Enquiry"
        WHERE "createdAt" >= ${p.start} AND "createdAt" < ${p.end} GROUP BY 1, 2`,
      this.prisma.$queryRaw<{ status: string; n: bigint; value: unknown }[]>`
        SELECT status::text AS status, COUNT(*) AS n, SUM("quotedTotal") AS value FROM "Quote"
        WHERE status::text <> 'DRAFT' AND "createdAt" >= ${p.start} AND "createdAt" < ${p.end} GROUP BY 1`,
      this.prisma.$queryRaw<{ median: unknown; avg: unknown }[]>`
        SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM ("quotedAt" - "createdAt")) / 3600) AS median,
               AVG(EXTRACT(EPOCH FROM ("quotedAt" - "createdAt")) / 3600) AS avg
        FROM "Quote" WHERE "quotedAt" IS NOT NULL AND "createdAt" >= ${p.start} AND "createdAt" < ${p.end}`,
      this.prisma.$queryRaw<{ created: bigint; accepted: bigint; paid: bigint; completed: bigint; declined: bigint }[]>`
        SELECT COUNT(*) AS created,
          COUNT(*) FILTER (WHERE "acceptedAt" IS NOT NULL) AS accepted,
          COUNT(*) FILTER (WHERE "paidAt" IS NOT NULL) AS paid,
          COUNT(*) FILTER (WHERE status::text IN ('COMPLETED', 'CLOSED')) AS completed,
          COUNT(*) FILTER (WHERE status::text = 'DECLINED') AS declined
        FROM "Booking" WHERE "isTest" = false AND "createdAt" >= ${p.start} AND "createdAt" < ${p.end}`,
      this.pipelineCounts(p),
      prev ? this.pipelineCounts(prev) : null,
    ]);
    const quoteBy = Object.fromEntries(quotes.map((r) => [r.status, { count: num(r.n), value: round2(num(r.value)) }]));
    const decided = (quoteBy.ACCEPTED?.count ?? 0) + (quoteBy.DECLINED?.count ?? 0);
    const enquiryByKind: Record<string, Record<string, number>> = {};
    for (const r of enquiries) enquiryByKind[r.kind] = { ...(enquiryByKind[r.kind] ?? {}), [r.status]: num(r.n) };
    const b = bookings[0];
    return {
      ...this.meta(q, p, prev, this.scope(q)),
      counts: current,
      previousCounts: previous,
      enquiriesByKind: enquiryByKind,
      quotesByStatus: quoteBy,
      quoteWinRate: decided ? round2(((quoteBy.ACCEPTED?.count ?? 0) / decided) * 100) : null,
      hoursToQuote: { median: quoteSpeed[0]?.median == null ? null : round2(num(quoteSpeed[0].median)), average: quoteSpeed[0]?.avg == null ? null : round2(num(quoteSpeed[0].avg)) },
      bookingFunnel: { created: num(b?.created), accepted: num(b?.accepted), paid: num(b?.paid), completed: num(b?.completed), declined: num(b?.declined) },
    };
  }

  /** Who buys: new and returning customers, repeat buying, tier mix and sign-ups. */
  async customers(q: InsightsQuery) {
    const { p, prev, scope } = this.context(q);
    const [cur, pre, signups] = await Promise.all([
      this.customerStats(q, p),
      prev ? this.customerStats(q, prev) : null,
      this.prisma.$queryRaw<{ users: bigint; companies: bigint }[]>`
        SELECT (SELECT COUNT(*) FROM "User" WHERE role::text IN ('CUSTOMER', 'COMPANY_ADMIN') AND "createdAt" >= ${p.start} AND "createdAt" < ${p.end}) AS users,
               (SELECT COUNT(*) FROM "Company" WHERE "createdAt" >= ${p.start} AND "createdAt" < ${p.end}) AS companies`,
    ]);
    return {
      ...this.meta(q, p, prev, scope),
      current: cur,
      previous: pre,
      change: pre ? { customers: change(cur.customers, pre.customers), newCustomers: change(cur.newCustomers, pre.newCustomers), revenuePerCustomer: change(cur.revenuePerCustomer, pre.revenuePerCustomer) } : null,
      signups: { accounts: num(signups[0]?.users), tradeApplications: num(signups[0]?.companies) },
    };
  }

  // -------------------------------------------------------------------------
  // Engine
  // -------------------------------------------------------------------------

  private context(q: InsightsQuery) {
    let p: Period;
    try {
      p = q.from || q.to ? period(q.from ?? q.to!, q.to ?? todaySast()) : defaultPeriod();
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    if (p.days > 1100) throw new BadRequestException("Choose a period of three years or less.");
    return { p, prev: comparisonPeriod(p, q.compare ?? "previous"), scope: this.scope(q) };
  }

  private scope(q: InsightsQuery): Scope {
    const lineFiltered = Boolean(q.family || q.category || q.sku);
    const orderOnly = Boolean(q.tier || q.channel || q.paymentMethod);
    const line = q.businessLine ?? "ALL";
    return {
      materials: line !== "HIRE",
      delivery: line !== "HIRE" && !lineFiltered,
      hire: line !== "MATERIALS" && !lineFiltered && !orderOnly,
      opex: line === "ALL" && !lineFiltered && !orderOnly && !q.province,
      lineFiltered,
    };
  }

  private meta(q: InsightsQuery, p: Period, prev: Period | null, scope: Scope) {
    return {
      period: { from: p.from, to: p.to, days: p.days },
      comparison: prev ? { from: prev.from, to: prev.to, kind: q.compare ?? "previous" } : null,
      vatBasis: vatBasis().basis,
      filters: Object.fromEntries(
        Object.entries({ businessLine: q.businessLine, family: q.family, category: q.category, sku: q.sku, province: q.province, tier: q.tier, channel: q.channel, paymentMethod: q.paymentMethod }).filter(([, v]) => v),
      ),
      includes: { materials: scope.materials, deliveryAndRefunds: scope.delivery, hire: scope.hire, operatingCosts: scope.opex },
    };
  }

  /** Order-level conditions (period on paidAt, tests excluded, province/tier/channel/payment method). */
  private orderWhere(q: InsightsQuery, p: Period, column: Prisma.Sql = Prisma.sql`o."paidAt"`) {
    return Prisma.sql`o."isTest" = false AND ${column} >= ${p.start} AND ${column} < ${p.end}
      ${q.province ? Prisma.sql`AND o."deliveryProvince" = ${q.province}` : Prisma.empty}
      ${q.tier ? Prisma.sql`AND o."customerTier"::text = ${q.tier}` : Prisma.empty}
      ${q.channel ? Prisma.sql`AND o.channel::text = ${q.channel}` : Prisma.empty}
      ${q.paymentMethod ? Prisma.sql`AND o."paymentMethod"::text = ${q.paymentMethod}` : Prisma.empty}`;
  }

  private lineWhere(q: InsightsQuery) {
    return Prisma.sql`${q.family ? Prisma.sql`AND li."pricingFamily" = ${q.family}` : Prisma.empty}
      ${q.category ? Prisma.sql`AND c.slug = ${q.category}` : Prisma.empty}
      ${q.sku ? Prisma.sql`AND p.sku = ${q.sku}` : Prisma.empty}`;
  }

  /** A bucket column in South African time, or a constant for totals. */
  private bucket(column: Prisma.Sql, g: Granularity | null) {
    return g ? Prisma.sql`to_char(date_trunc(${g}, (${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Johannesburg'), 'YYYY-MM-DD')` : Prisma.sql`${TOTAL}`;
  }

  /** Every metric for a period, as one total (g = null) or per bucket. */
  private async metrics(q: InsightsQuery, p: Period, g: Granularity | null, scope: Scope): Promise<Map<string, Metrics>> {
    const { divisor } = vatBasis();
    const lineBucket = this.bucket(Prisma.sql`o."paidAt"`, g);
    const refundBucket = this.bucket(Prisma.sql`r."refundedAt"`, g);
    const bookingBucket = this.bucket(Prisma.sql`b."paidAt"`, g);
    const orderWhere = this.orderWhere(q, p);
    const province = q.province ? Prisma.sql`AND b.province = ${q.province}` : Prisma.empty;
    const [lines, orders, refunds, bookings, bookingRefunds] = await Promise.all([
      scope.materials
        ? this.prisma.$queryRaw<{ k: string; revenue: unknown; cogs: unknown; missing: bigint; estimated: bigint; orders: bigint; lines: bigint }[]>`
            SELECT ${lineBucket} AS k,
              SUM(li."lineTotal") AS revenue,
              SUM(li."unitCost" * li.quantity::numeric) AS cogs,
              COUNT(*) FILTER (WHERE li."unitCost" IS NULL) AS missing,
              COUNT(*) FILTER (WHERE li."costSource"::text = 'ESTIMATED') AS estimated,
              COUNT(DISTINCT o.id) AS orders,
              COUNT(*) AS lines
            FROM "OrderLineItem" li
            JOIN "Order" o ON o.id = li."orderId"
            JOIN "Product" p ON p.id = li."productId"
            JOIN "Category" c ON c.id = p."categoryId"
            WHERE ${orderWhere} ${this.lineWhere(q)}
            GROUP BY 1`
        : [],
      scope.delivery
        ? this.prisma.$queryRaw<{ k: string; fees: unknown; cost: unknown; missing: bigint }[]>`
            SELECT ${lineBucket} AS k,
              SUM(o."deliveryFee") AS fees,
              SUM(s."deliveryCost") AS cost,
              COUNT(*) FILTER (WHERE s."dispatchedAt" IS NOT NULL AND s."deliveryCost" IS NULL
                AND EXISTS (SELECT 1 FROM "OrderLineItem" x WHERE x."orderId" = o.id AND x."pricingFamily" IS DISTINCT FROM 'READY_MIX')) AS missing
            FROM "Order" o LEFT JOIN "Shipment" s ON s."orderId" = o.id
            WHERE ${orderWhere}
            GROUP BY 1`
        : [],
      scope.delivery
        ? this.prisma.$queryRaw<{ k: string; amount: unknown }[]>`
            SELECT ${refundBucket} AS k, SUM(r.amount) AS amount
            FROM "Refund" r JOIN "Order" o ON o.id = r."orderId"
            WHERE ${this.orderWhere(q, p, Prisma.sql`r."refundedAt"`)}
            GROUP BY 1`
        : [],
      scope.hire
        ? this.prisma.$queryRaw<{ k: string; n: bigint; gbv: unknown; commission: unknown }[]>`
            SELECT ${bookingBucket} AS k, COUNT(*) AS n, SUM(b."customerTotal") AS gbv, SUM(b."customerTotal" - b."partnerAmount") AS commission
            FROM "Booking" b
            WHERE b."isTest" = false AND b."paidAt" >= ${p.start} AND b."paidAt" < ${p.end} AND b.status::text <> 'CANCELLED' ${province}
            GROUP BY 1`
        : [],
      scope.hire
        ? this.prisma.$queryRaw<{ k: string; amount: unknown }[]>`
            SELECT ${refundBucket} AS k, SUM(r.amount) AS amount
            FROM "Refund" r JOIN "Booking" b ON b.id = r."bookingId"
            WHERE b."isTest" = false AND r."refundedAt" >= ${p.start} AND r."refundedAt" < ${p.end} ${province}
            GROUP BY 1`
        : [],
    ]);
    const out = new Map<string, Metrics>();
    const at = (k: string) => {
      if (!out.has(k)) out.set(k, emptyMetrics());
      return out.get(k)!;
    };
    if (!g) at(TOTAL);
    for (const r of lines) {
      const m = at(r.k);
      m.materialsRevenue = num(r.revenue) / divisor;
      m.cogs = num(r.cogs) / divisor;
      m.linesMissingCost = num(r.missing);
      m.linesEstimated = num(r.estimated);
      m.orders = num(r.orders);
      m.orderLines = num(r.lines);
    }
    for (const r of orders) {
      const m = at(r.k);
      m.deliveryRevenue = num(r.fees) / divisor;
      m.deliveryCost = num(r.cost);
      m.deliveriesMissingCost = num(r.missing);
    }
    for (const r of refunds) at(r.k).refunds = num(r.amount) / divisor;
    for (const r of bookings) {
      const m = at(r.k);
      m.bookings = num(r.n);
      m.hireGrossValue = num(r.gbv) / divisor;
      m.hireCommission = num(r.commission) / divisor;
    }
    for (const r of bookingRefunds) at(r.k).hireRefunds = num(r.amount) / divisor;
    for (const m of out.values()) {
      m.netRevenue = m.materialsRevenue + m.deliveryRevenue + m.hireCommission - m.refunds;
      m.grossProfit = m.netRevenue - m.cogs - m.deliveryCost;
      m.grossMargin = m.netRevenue ? round2((m.grossProfit / m.netRevenue) * 100) : null;
      m.averageOrderValue = m.orders ? (m.materialsRevenue + m.deliveryRevenue) / m.orders : 0;
      for (const k of ["materialsRevenue", "deliveryRevenue", "hireGrossValue", "hireCommission", "refunds", "hireRefunds", "netRevenue", "cogs", "deliveryCost", "grossProfit", "averageOrderValue"] as const) {
        m[k] = round2(m[k]);
      }
    }
    return out;
  }

  /** Material line totals grouped by one dimension (product gross profit excludes delivery). */
  private async groupRows(q: BreakdownQuery, p: Period, by: BreakdownBy) {
    const { divisor } = vatBasis();
    const gdef = GROUPS[by];
    const rows = await this.prisma.$queryRaw<{ key: string; label: string; extra: string | null; revenue: unknown; cogs: unknown; missing: bigint; orders: bigint; lines: bigint; quantity: unknown }[]>`
      SELECT ${Prisma.raw(gdef.key)} AS key, ${Prisma.raw(gdef.label)} AS label, ${Prisma.raw(gdef.extra ?? "NULL")} AS extra,
        SUM(li."lineTotal") AS revenue,
        SUM(li."unitCost" * li.quantity::numeric) AS cogs,
        COUNT(*) FILTER (WHERE li."unitCost" IS NULL) AS missing,
        COUNT(DISTINCT o.id) AS orders,
        COUNT(*) AS lines,
        SUM(li.quantity) AS quantity
      FROM "OrderLineItem" li
      JOIN "Order" o ON o.id = li."orderId"
      JOIN "Product" p ON p.id = li."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      ${Prisma.raw(gdef.join ?? "")}
      WHERE ${this.orderWhere(q, p)} ${this.lineWhere(q)}
      GROUP BY 1, 2, 3`;
    return rows.map((r) => {
      const revenue = num(r.revenue) / divisor;
      const cogs = num(r.cogs) / divisor;
      const grossProfit = revenue - cogs;
      return {
        key: r.key,
        label: r.label,
        detail: r.extra,
        revenue: round2(revenue),
        orders: num(r.orders),
        lines: num(r.lines),
        // Only meaningful per product (each row is one unit of sale).
        quantity: by === "product" ? round2(num(r.quantity)) : null,
        cogs: round2(cogs),
        grossProfit: round2(grossProfit),
        grossMargin: revenue ? round2((grossProfit / revenue) * 100) : null,
        linesMissingCost: num(r.missing),
      };
    });
  }

  private async paidBookings(p: Period, province: Prisma.Sql) {
    const { divisor } = vatBasis();
    const [r] = await this.prisma.$queryRaw<{ n: bigint; gbv: unknown; commission: unknown; assigned: bigint; unfulfilled: bigint; minutes: unknown }[]>`
      SELECT COUNT(*) AS n, SUM(b."customerTotal") AS gbv, SUM(b."customerTotal" - b."partnerAmount") AS commission,
        COUNT(*) FILTER (WHERE b."assignedAt" IS NOT NULL) AS assigned,
        COUNT(*) FILTER (WHERE b.status::text = 'UNFULFILLED') AS unfulfilled,
        AVG(EXTRACT(EPOCH FROM (b."assignedAt" - b."paidAt")) / 60) FILTER (WHERE b."assignedAt" IS NOT NULL) AS minutes
      FROM "Booking" b
      WHERE b."isTest" = false AND b."paidAt" >= ${p.start} AND b."paidAt" < ${p.end} AND b.status::text <> 'CANCELLED' ${province}`;
    const bookings = num(r?.n);
    return {
      bookings,
      hireGrossValue: round2(num(r?.gbv) / divisor),
      hireCommission: round2(num(r?.commission) / divisor),
      partnerAssigned: num(r?.assigned),
      unfulfilled: num(r?.unfulfilled),
      fillRate: bookings ? round2((num(r?.assigned) / bookings) * 100) : null,
      averageMinutesToAssign: r?.minutes == null ? null : round2(num(r.minutes)),
    };
  }

  private async pipelineCounts(p: Period) {
    const [r] = await this.prisma.$queryRaw<{ enquiries: bigint; quotes: bigint; quoted: bigint; accepted: bigint; bookings: bigint }[]>`
      SELECT
        (SELECT COUNT(*) FROM "Enquiry" WHERE "createdAt" >= ${p.start} AND "createdAt" < ${p.end}) AS enquiries,
        (SELECT COUNT(*) FROM "Quote" WHERE status::text <> 'DRAFT' AND "createdAt" >= ${p.start} AND "createdAt" < ${p.end}) AS quotes,
        (SELECT COUNT(*) FROM "Quote" WHERE "quotedAt" >= ${p.start} AND "quotedAt" < ${p.end}) AS quoted,
        (SELECT COUNT(*) FROM "Quote" WHERE status::text = 'ACCEPTED' AND "respondedAt" >= ${p.start} AND "respondedAt" < ${p.end}) AS accepted,
        (SELECT COUNT(*) FROM "Booking" WHERE "isTest" = false AND "createdAt" >= ${p.start} AND "createdAt" < ${p.end}) AS bookings`;
    return { enquiries: num(r?.enquiries), quoteRequests: num(r?.quotes), quotesPriced: num(r?.quoted), quotesAccepted: num(r?.accepted), bookingsQuoted: num(r?.bookings) };
  }

  private async customerStats(q: InsightsQuery, p: Period) {
    const { divisor } = vatBasis();
    const [r] = await this.prisma.$queryRaw<{ customers: bigint; new_customers: bigint; repeat: bigint; revenue: unknown; new_revenue: unknown }[]>`
      WITH paid AS (
        SELECT COALESCE(o."companyId", o."userId") AS who, o.id, o.subtotal + o."deliveryFee" AS amount
        FROM "Order" o WHERE ${this.orderWhere(q, p)} AND COALESCE(o."companyId", o."userId") IS NOT NULL
      ),
      firsts AS (
        SELECT COALESCE(o."companyId", o."userId") AS who, MIN(o."paidAt") AS first_paid
        FROM "Order" o WHERE o."isTest" = false AND o."paidAt" IS NOT NULL AND COALESCE(o."companyId", o."userId") IS NOT NULL
        GROUP BY 1
      ),
      per AS (
        SELECT paid.who, COUNT(*) AS n, SUM(paid.amount) AS amount, MIN(f.first_paid) AS first_paid
        FROM paid JOIN firsts f ON f.who = paid.who GROUP BY 1
      )
      SELECT COUNT(*) AS customers,
        COUNT(*) FILTER (WHERE first_paid >= ${p.start}) AS new_customers,
        COUNT(*) FILTER (WHERE n >= 2) AS repeat,
        SUM(amount) AS revenue,
        SUM(amount) FILTER (WHERE first_paid >= ${p.start}) AS new_revenue
      FROM per`;
    const tiers = await this.prisma.$queryRaw<{ tier: string; revenue: unknown; orders: bigint }[]>`
      SELECT COALESCE(o."customerTier"::text, 'UNKNOWN') AS tier, SUM(o.subtotal + o."deliveryFee") AS revenue, COUNT(*) AS orders
      FROM "Order" o WHERE ${this.orderWhere(q, p)} GROUP BY 1`;
    const customers = num(r?.customers);
    const revenue = num(r?.revenue) / divisor;
    return {
      customers,
      newCustomers: num(r?.new_customers),
      returningCustomers: customers - num(r?.new_customers),
      repeatCustomers: num(r?.repeat),
      repeatRate: customers ? round2((num(r?.repeat) / customers) * 100) : null,
      revenue: round2(revenue),
      newCustomerRevenue: round2(num(r?.new_revenue) / divisor),
      revenuePerCustomer: customers ? round2(revenue / customers) : 0,
      tierMix: tiers.map((t) => ({ tier: t.tier, revenue: round2(num(t.revenue) / divisor), orders: num(t.orders) })),
    };
  }

  /** Operating costs for a period: whole months count in full; part months are prorated by days. */
  private async operatingCosts(p: Period) {
    const first = new Date(`${p.from.slice(0, 7)}-01T00:00:00.000Z`);
    const last = new Date(`${p.to.slice(0, 7)}-01T00:00:00.000Z`);
    const rows = await this.prisma.operatingCost.findMany({ where: { month: { gte: first, lte: last } }, select: { month: true, category: true, amountExVat: true } });
    const byCategory: Record<string, number> = {};
    let total = 0;
    const months = new Set<string>();
    for (const r of rows) {
      const y = r.month.getUTCFullYear();
      const m = r.month.getUTCMonth();
      const monthStart = Date.UTC(y, m, 1);
      const monthEnd = Date.UTC(y, m + 1, 1);
      const days = (monthEnd - monthStart) / 86_400_000;
      const from = Math.max(monthStart, Date.parse(`${p.from}T00:00:00Z`));
      const to = Math.min(monthEnd, Date.parse(`${p.to}T00:00:00Z`) + 86_400_000);
      const share = Math.max(0, (to - from) / 86_400_000) / days;
      const amount = Number(r.amountExVat) * share;
      byCategory[r.category] = round2((byCategory[r.category] ?? 0) + amount);
      total += amount;
      months.add(r.month.toISOString().slice(0, 7));
    }
    const expected = bucketKeys(p, "month").map((k) => k.slice(0, 7));
    return { total: round2(total), byCategory, monthsMissing: expected.filter((m) => !months.has(m)) };
  }
}
