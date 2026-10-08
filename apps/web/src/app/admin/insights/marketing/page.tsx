import Link from "next/link";
import { ColumnChart } from "@/components/insights/Charts";
import { BarList, ChartCard, DataTable, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { count, formatDay, insights, label, pct, rand, readFilters, type Marketing, type SearchParams } from "@/lib/insights";
import { InsightsFilters } from "../shared";

export const metadata = { title: "Marketing" };

const SLOT: Record<string, string> = {
  HOMEPAGE_SECONDARY_BANNER: "Homepage banner",
  CATEGORY_TOP_BANNER: "Category banner",
  QUOTE_FLOW_UPSELL: "Quote upsell",
  FOOTER_STRIP: "Footer strip",
  GROUP_CROSS_SELL: "Group cross-sell",
};
const AUDIENCE: Record<string, string> = { CUSTOMER: "Customers", CONTRACTOR: "Contractors", PARTNER: "Partners", OTHER: "Other" };

export default async function MarketingInsights({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(searchParams);
  const marketing = await insights<Marketing>("marketing", f);
  const filters = <InsightsFilters f={f} controls={[]} />;
  if (!marketing.ok) return <div className="space-y-4">{filters}<Unavailable message={marketing.message} /></div>;
  const m = marketing.data;
  const daily = m.promotions.daily.map((d) => ({ label: formatDay(d.day, { day: "numeric", month: "short" }), ...d }));
  const channelTotal = m.channels.reduce((n, c) => n + c.revenue, 0);

  return (
    <div className="space-y-4">
      {filters}
      <TileGrid>
        <StatTile label="Promotion views" value={count(m.promotions.impressions)} />
        <StatTile label="Promotion clicks" value={count(m.promotions.clicks)} note={`Click-through ${pct(m.promotions.clickThroughRate)}`} />
        <StatTile label="Newsletter sign-ups" value={count(m.newsletter.signups)} />
        <StatTile label="Sales from social referrals" value={rand(m.channels.filter((c) => c.key.endsWith("_REFERRAL")).reduce((n, c) => n + c.revenue, 0))} note="Instagram and Facebook referrals" />
      </TileGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Promotion views per day"
          subtitle="Every promotion slot combined"
          table={
            <DataTable
              rows={m.promotions.daily}
              columns={[
                { key: "d", label: "Day", render: (d) => formatDay(d.day) },
                { key: "i", label: "Views", numeric: true, render: (d) => count(d.impressions) },
                { key: "c", label: "Clicks", numeric: true, render: (d) => count(d.clicks) },
              ]}
            />
          }
        >
          <ColumnChart format="count" series={[{ key: "impressions", name: "Views" }]} data={daily} />
        </ChartCard>
        <ChartCard title="Promotion clicks per day" subtitle="Clicks through to the promoted page">
          <ColumnChart format="count" series={[{ key: "clicks", name: "Clicks", color: "#eb6834" }]} data={daily} />
        </ChartCard>
      </div>
      <ChartCard title="Promotions" subtitle="Active promotions and any shown in the period" action={<Link href="/admin/promotions" className="text-seam-blue hover:underline">Manage promotions</Link>}>
        <DataTable
          caption="Promotion performance"
          rows={m.promotions.rows}
          empty="No promotions were shown in this period."
          columns={[
            { key: "t", label: "Promotion", render: (r) => <span>{r.title}<span className="block text-xs text-slate">{SLOT[r.slot] ?? r.slot}{r.isActive ? "" : " · inactive"}</span></span> },
            { key: "i", label: "Views", numeric: true, render: (r) => count(r.impressions) },
            { key: "c", label: "Clicks", numeric: true, render: (r) => count(r.clicks) },
            { key: "r", label: "Click-through", numeric: true, render: (r) => pct(r.clickThroughRate) },
          ]}
        />
      </ChartCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Material sales by channel" subtitle="Where paid orders came from">
          <BarList format={rand} rows={m.channels.map((c) => ({ label: label("channel", c.key), value: c.revenue, detail: `${channelTotal ? pct(Math.round((c.revenue / channelTotal) * 1000) / 10) : "—"} · ${count(c.orders)} orders` }))} />
        </ChartCard>
        <ChartCard title="Newsletter sign-ups" subtitle="By the page they signed up on, and who they are">
          <BarList format={count} rows={Object.entries(m.newsletter.bySource).sort((a, b) => b[1] - a[1]).map(([source, n]) => ({ label: source, value: n }))} empty="No sign-ups in this period." />
          {m.newsletter.signups > 0 && (
            <p className="mt-3 font-body text-xs text-slate">
              {Object.entries(m.newsletter.byAudience)
                .map(([a, n]) => `${AUDIENCE[a] ?? a}: ${count(n)}`)
                .join(" · ")}
            </p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
