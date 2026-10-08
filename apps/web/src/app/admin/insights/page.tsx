import Link from "next/link";
import { ColumnChart, TrendChart } from "@/components/insights/Charts";
import { BarList, ChartCard, DataTable, Notices, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { bucketLabel, count, insights, pageQuery, pct, rand, randCompact, readFilters, formatDay, periodLabel, type Breakdown, type SearchParams, type Summary, type Timeseries } from "@/lib/insights";
import { getSession } from "@/lib/session";
import { csvHref, InsightsFilters, scopeNote, vatNote, vsLabel } from "./shared";

export const metadata = { title: "Overview" };

export default async function InsightsOverview({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(searchParams);
  const user = await getSession();
  const isAdmin = user?.role === "ADMIN";
  const [summary, series, products] = await Promise.all([
    insights<Summary>("summary", f),
    insights<Timeseries>("timeseries", f),
    insights<Breakdown>("breakdown", f, { by: "product", limit: 5 }),
  ]);
  const filters = <InsightsFilters f={f} controls={["compare", "granularity", "businessLine", "province", "tier", "channel", "paymentMethod"]} />;
  if (!summary.ok) return <div className="space-y-4">{filters}<Unavailable message={summary.message} /></div>;
  const s = summary.data;
  const c = s.current;
  const vs = vsLabel(s);
  const g = series.ok ? series.data.granularity : "day";
  const buckets = series.ok ? series.data.buckets : [];
  const trend = buckets.map((b) => ({
    label: bucketLabel(b.key, g),
    tooltipLabel: b.previousKey ? `${bucketLabel(b.key, g)} (vs ${bucketLabel(b.previousKey, g)})` : bucketLabel(b.key, g),
    current: b.current.netRevenue,
    previous: b.previous?.netRevenue ?? null,
  }));
  const mix = buckets.map((b) => ({ label: bucketLabel(b.key, g), materials: b.current.materialsRevenue, delivery: b.current.deliveryRevenue, hire: b.current.hireCommission }));

  return (
    <div className="space-y-4">
      {filters}
      <p className="font-body text-xs text-slate">
        {periodLabel(s)}
        {s.comparison ? ` · compared with ${formatDay(s.comparison.from)} – ${formatDay(s.comparison.to)}` : ""}
      </p>
      <TileGrid>
        <StatTile label="Net revenue" value={randCompact(c.netRevenue)} delta={s.change.netRevenue} vs={vs} note="Materials + delivery + hire commission − refunds" />
        <StatTile label="Material sales" value={randCompact(c.materialsRevenue)} delta={s.change.materialsRevenue} vs={vs} />
        <StatTile label="Paid orders" value={count(c.orders)} delta={s.change.orders} vs={vs} note={`Average order ${rand(c.averageOrderValue)}`} />
        <StatTile label="Hire commission" value={randCompact(c.hireCommission)} delta={s.change.hireCommission} vs={vs} note={`${count(c.bookings)} paid bookings · ${randCompact(c.hireGrossValue)} booking value`} />
        {isAdmin && (
          <>
            <StatTile label="Gross profit" value={randCompact(c.grossProfit)} delta={s.change.grossProfit} vs={vs} adminOnly />
            <StatTile label="Gross margin" value={pct(c.grossMargin)} adminOnly note="Gross profit ÷ net revenue" />
            <StatTile label="Operating costs" value={c.operatingCosts === null ? "—" : randCompact(c.operatingCosts)} adminOnly note={c.operatingCosts === null ? "Not in a filtered view" : "Prorated for part months"} />
            <StatTile label="Net profit" value={c.netProfit === null ? "—" : randCompact(c.netProfit)} delta={s.change.netProfit} vs={vs} adminOnly />
          </>
        )}
      </TileGrid>

      <Notices
        items={[
          vatNote(s),
          scopeNote(s),
          c.refunds > 0 && `${rand(c.refunds)} refunded in this period is deducted from net revenue.`,
          isAdmin && (c.linesMissingCost ?? 0) > 0 && `${count(c.linesMissingCost)} order lines have no cost recorded, so gross profit is overstated by their cost.`,
          isAdmin && (c.linesEstimated ?? 0) > 0 && `${count(c.linesEstimated)} order lines use estimated costs (orders placed before costs were recorded).`,
          isAdmin && (c.deliveriesMissingCost ?? 0) > 0 && (
            <>
              {count(c.deliveriesMissingCost)} dispatched deliveries have no delivery cost. Set standard rates on <Link className="underline" href="/admin/finance">Finance</Link>.
            </>
          ),
          isAdmin && (c.operatingCostMonthsMissing?.length ?? 0) > 0 && (
            <>
              No operating costs entered for {c.operatingCostMonthsMissing!.map((m) => formatDay(`${m}-01`, { month: "long", year: "numeric" })).join(", ")}, so net profit is overstated. Add them on <Link className="underline" href="/admin/finance">Finance</Link>.
            </>
          ),
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Net revenue"
          subtitle={s.comparison ? "This period against the comparison period, bucket by bucket" : "This period"}
          csvHref={csvHref("timeseries", f)}
          table={
            <DataTable
              caption="Net revenue by period"
              rows={buckets}
              columns={[
                { key: "k", label: "Period", render: (b) => bucketLabel(b.key, g) },
                { key: "c", label: "Net revenue", numeric: true, render: (b) => rand(b.current.netRevenue) },
                ...(s.comparison ? [{ key: "p", label: "Comparison", numeric: true, render: (b: (typeof buckets)[number]) => rand(b.previous?.netRevenue) }] : []),
              ]}
            />
          }
        >
          <TrendChart data={trend} format="rand" currentName="This period" previousName={s.comparison ? (s.comparison.kind === "year" ? "Last year" : "Previous period") : null} />
        </ChartCard>

        <ChartCard
          title="Where revenue comes from"
          subtitle="Material sales, delivery fees and hire commission"
          table={
            <DataTable
              caption="Revenue mix by period"
              rows={buckets}
              columns={[
                { key: "k", label: "Period", render: (b) => bucketLabel(b.key, g) },
                { key: "m", label: "Materials", numeric: true, render: (b) => rand(b.current.materialsRevenue) },
                { key: "d", label: "Delivery", numeric: true, render: (b) => rand(b.current.deliveryRevenue) },
                { key: "h", label: "Hire commission", numeric: true, render: (b) => rand(b.current.hireCommission) },
              ]}
            />
          }
        >
          <ColumnChart
            data={mix}
            format="rand"
            series={[
              { key: "materials", name: "Materials" },
              { key: "delivery", name: "Delivery fees" },
              { key: "hire", name: "Hire commission" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Best-selling products" subtitle="By material sales in the period" action={<Link href={`/admin/insights/products?${pageQuery(f)}`} className="text-seam-blue hover:underline">All products</Link>}>
          <BarList
            format={rand}
            rows={(products.ok ? products.data.rows : []).map((r) => ({
              label: r.label,
              value: r.revenue,
              detail: [r.detail, `${pct(r.share)} of sales`, r.growth === null ? null : `${r.growth > 0 ? "+" : ""}${r.growth}% vs comparison`, isAdmin && r.grossMargin !== undefined ? `margin ${pct(r.grossMargin)}` : null].filter(Boolean).join(" · "),
            }))}
          />
        </ChartCard>

        <ChartCard title="Pipeline in the period" subtitle="Requests that came in, and what became of them" action={<Link href={`/admin/insights/pipeline?${pageQuery(f)}`} className="text-seam-blue hover:underline">Pipeline</Link>}>
          <dl className="grid grid-cols-2 gap-3 font-body text-sm">
            {[
              ["Enquiries (hire, services, job packs)", s.pipeline.enquiries],
              ["Quote requests", s.pipeline.quoteRequests],
              ["Quotes priced", s.pipeline.quotesPriced],
              ["Quotes accepted", s.pipeline.quotesAccepted],
              ["Hire bookings quoted", s.pipeline.bookingsQuoted],
              ["Paid hire bookings", c.bookings],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-sm bg-limestone/60 p-3">
                <dt className="text-xs text-slate">{label}</dt>
                <dd className="mt-0.5 font-display text-xl font-semibold text-basalt">{count(value as number)}</dd>
              </div>
            ))}
          </dl>
        </ChartCard>
      </div>
    </div>
  );
}
