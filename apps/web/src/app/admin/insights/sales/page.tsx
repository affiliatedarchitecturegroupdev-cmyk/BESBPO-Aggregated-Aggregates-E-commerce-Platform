import { ColumnChart, TrendChart } from "@/components/insights/Charts";
import { BarList, ChartCard, DataTable, Notices, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { bucketLabel, count, insights, label, pct, rand, randCompact, readFilters, type Breakdown, type SearchParams, type Summary, type Timeseries } from "@/lib/insights";
import { csvHref, InsightsFilters, scopeNote, vatNote, vsLabel } from "../shared";

export const metadata = { title: "Sales" };

export default async function SalesInsights({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(searchParams);
  const [summary, series, channels, methods, tiers] = await Promise.all([
    insights<Summary>("summary", f),
    insights<Timeseries>("timeseries", f),
    insights<Breakdown>("breakdown", f, { by: "channel" }),
    insights<Breakdown>("breakdown", f, { by: "paymentMethod" }),
    insights<Breakdown>("breakdown", f, { by: "tier" }),
  ]);
  const filters = <InsightsFilters f={f} controls={["compare", "granularity", "businessLine", "province", "tier", "channel", "paymentMethod", "family", "category"]} />;
  if (!summary.ok || !series.ok) return <div className="space-y-4">{filters}<Unavailable message={!summary.ok ? summary.message : !series.ok ? series.message : ""} /></div>;
  const s = summary.data;
  const c = s.current;
  const vs = vsLabel(s);
  const g = series.data.granularity;
  const buckets = series.data.buckets;
  const prevName = s.comparison ? (s.comparison.kind === "year" ? "Last year" : "Previous period") : null;
  const breakdownCard = (title: string, data: typeof channels, group: "channel" | "paymentMethod" | "tier", by: string) => (
    <ChartCard title={title} subtitle="Material sales and share" csvHref={csvHref("breakdown", f, { by })}>
      <BarList
        format={rand}
        rows={(data.ok ? data.data.rows : []).map((r) => ({
          label: label(group, r.key),
          value: r.revenue,
          detail: `${pct(r.share)} · ${count(r.orders)} orders${r.growth === null ? "" : ` · ${r.growth > 0 ? "+" : ""}${r.growth}% vs comparison`}`,
        }))}
      />
    </ChartCard>
  );

  return (
    <div className="space-y-4">
      {filters}
      <TileGrid>
        <StatTile label="Material sales" value={randCompact(c.materialsRevenue)} delta={s.change.materialsRevenue} vs={vs} />
        <StatTile label="Delivery fees" value={randCompact(c.deliveryRevenue)} delta={s.change.deliveryRevenue} vs={vs} />
        <StatTile label="Paid orders" value={count(c.orders)} delta={s.change.orders} vs={vs} note={`${count(c.orderLines)} order lines`} />
        <StatTile label="Average order value" value={rand(c.averageOrderValue)} delta={s.change.averageOrderValue} vs={vs} note="Materials + delivery per order" />
      </TileGrid>
      <Notices items={[vatNote(s), scopeNote(s), c.refunds > 0 && `Refunds of ${rand(c.refunds)} in this period are deducted from net revenue, not from material sales.`]} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Material sales"
          subtitle={prevName ? `Against ${prevName.toLowerCase()}` : undefined}
          csvHref={csvHref("timeseries", f)}
          table={
            <DataTable
              caption="Material sales by period"
              rows={buckets}
              columns={[
                { key: "k", label: "Period", render: (b) => bucketLabel(b.key, g) },
                { key: "m", label: "Material sales", numeric: true, render: (b) => rand(b.current.materialsRevenue) },
                { key: "d", label: "Delivery fees", numeric: true, render: (b) => rand(b.current.deliveryRevenue) },
                { key: "o", label: "Orders", numeric: true, render: (b) => count(b.current.orders) },
                { key: "a", label: "Avg order", numeric: true, render: (b) => rand(b.current.averageOrderValue) },
                ...(prevName ? [{ key: "p", label: prevName, numeric: true, render: (b: (typeof buckets)[number]) => rand(b.previous?.materialsRevenue) }] : []),
              ]}
            />
          }
        >
          <TrendChart
            format="rand"
            currentName="This period"
            previousName={prevName}
            data={buckets.map((b) => ({ label: bucketLabel(b.key, g), current: b.current.materialsRevenue, previous: b.previous?.materialsRevenue ?? null }))}
          />
        </ChartCard>
        <ChartCard title="Paid orders" subtitle="Orders with payment confirmed in each period">
          <ColumnChart format="count" series={[{ key: "orders", name: "Orders" }]} data={buckets.map((b) => ({ label: bucketLabel(b.key, g), orders: b.current.orders }))} />
        </ChartCard>
        <ChartCard title="Average order value" subtitle="Materials and delivery per paid order">
          <TrendChart
            format="rand"
            currentName="This period"
            previousName={prevName}
            data={buckets.map((b) => ({ label: bucketLabel(b.key, g), current: b.current.averageOrderValue, previous: b.previous?.averageOrderValue ?? null }))}
          />
        </ChartCard>
        {breakdownCard("By channel", channels, "channel", "channel")}
        {breakdownCard("By payment method", methods, "paymentMethod", "paymentMethod")}
        {breakdownCard("By customer tier", tiers, "tier", "tier")}
      </div>
    </div>
  );
}
