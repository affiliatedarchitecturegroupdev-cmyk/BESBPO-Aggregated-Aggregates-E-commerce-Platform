import Link from "next/link";
import { BarList, ChartCard, DataTable, Notices, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { count, insights, pct, rand, randCompact, readFilters, type Breakdown, type Hire, type SearchParams, type Summary } from "@/lib/insights";
import { getSession } from "@/lib/session";
import { csvHref, InsightsFilters, vatNote, vsLabel } from "../shared";

export const metadata = { title: "Geography & delivery" };

export default async function GeographyInsights({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(searchParams);
  const user = await getSession();
  const isAdmin = user?.role === "ADMIN";
  const mf = { ...f, businessLine: "MATERIALS" };
  const [provinces, suppliers, summary, hire] = await Promise.all([
    insights<Breakdown>("breakdown", f, { by: "province" }),
    insights<Breakdown>("breakdown", f, { by: "supplier", limit: 50 }),
    insights<Summary>("summary", mf),
    insights<Hire>("hire", f),
  ]);
  const filters = <InsightsFilters f={f} controls={["compare", "province", "tier", "channel"]} />;
  if (!provinces.ok || !summary.ok) return <div className="space-y-4">{filters}<Unavailable message={!provinces.ok ? provinces.message : !summary.ok ? summary.message : ""} /></div>;
  const c = summary.data.current;
  const vs = vsLabel(summary.data);
  const deliveryMargin = isAdmin && c.deliveryCost !== undefined ? c.deliveryRevenue - c.deliveryCost : null;

  return (
    <div className="space-y-4">
      {filters}
      <TileGrid>
        <StatTile label="Delivery fees charged" value={randCompact(c.deliveryRevenue)} delta={summary.data.change.deliveryRevenue} vs={vs} />
        <StatTile label="Provinces with sales" value={count(provinces.data.rows.filter((r) => r.key !== "Unknown").length)} note="Of 9" />
        {isAdmin && (
          <>
            <StatTile label="Delivery cost" value={randCompact(c.deliveryCost)} adminOnly note={(c.deliveriesMissingCost ?? 0) > 0 ? `${count(c.deliveriesMissingCost)} deliveries without a cost` : "Actual amounts, else standard rates"} />
            <StatTile label="Delivery margin" value={randCompact(deliveryMargin)} adminOnly note={c.deliveryRevenue ? `${pct(Math.round(((deliveryMargin ?? 0) / c.deliveryRevenue) * 1000) / 10)} of fees` : undefined} />
          </>
        )}
      </TileGrid>
      <Notices
        items={[
          vatNote(provinces.data),
          isAdmin && (c.deliveriesMissingCost ?? 0) > 0 && (
            <>
              Delivery margin is overstated until every dispatched delivery has a cost — set standard rates on <Link className="underline" href="/admin/finance">Finance</Link> or record the actual amount at dispatch.
            </>
          ),
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Material sales by province"
          subtitle="Delivery province of paid orders"
          csvHref={csvHref("breakdown", f, { by: "province" })}
          table={
            <DataTable
              rows={provinces.data.rows}
              columns={[
                { key: "p", label: "Province", render: (r) => r.label },
                { key: "r", label: "Sales", numeric: true, render: (r) => rand(r.revenue) },
                { key: "s", label: "Share", numeric: true, render: (r) => pct(r.share) },
                { key: "o", label: "Orders", numeric: true, render: (r) => count(r.orders) },
                { key: "g", label: "Growth", numeric: true, render: (r) => (r.growth === null ? "—" : `${r.growth > 0 ? "+" : ""}${r.growth}%`) },
                ...(isAdmin ? [{ key: "m", label: "Margin", numeric: true, render: (r: { grossMargin?: number | null }) => pct(r.grossMargin) }] : []),
              ]}
            />
          }
        >
          <BarList format={rand} rows={provinces.data.rows.map((r) => ({ label: r.label, value: r.revenue, detail: `${pct(r.share)} · ${count(r.orders)} orders` }))} />
        </ChartCard>
        <ChartCard title="Hire bookings by province" subtitle="Site province of paid bookings">
          <BarList format={rand} rows={(hire.ok ? hire.data.provinces : []).map((p) => ({ label: p.province, value: p.hireGrossValue, detail: `${count(p.bookings)} bookings · ${rand(p.hireCommission)} commission` }))} />
        </ChartCard>
      </div>
      <ChartCard title="Sales by fulfilling supplier" subtitle="The supplier recorded at dispatch" csvHref={csvHref("breakdown", f, { by: "supplier", limit: "500" })}>
        <DataTable
          caption="Sales by supplier"
          rows={suppliers.ok ? suppliers.data.rows : []}
          columns={[
            { key: "s", label: "Supplier", render: (r) => r.label },
            { key: "r", label: "Sales", numeric: true, render: (r) => rand(r.revenue) },
            { key: "sh", label: "Share", numeric: true, render: (r) => pct(r.share) },
            { key: "o", label: "Orders", numeric: true, render: (r) => count(r.orders) },
            ...(isAdmin ? [{ key: "m", label: "Margin", numeric: true, render: (r: { grossMargin?: number | null }) => pct(r.grossMargin) }] : []),
          ]}
        />
      </ChartCard>
    </div>
  );
}
