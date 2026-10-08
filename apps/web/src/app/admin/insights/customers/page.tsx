import { BarList, ChartCard, DataTable, Notices, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { count, insights, label, pct, rand, randCompact, readFilters, type Breakdown, type Customers, type SearchParams } from "@/lib/insights";
import { getSession } from "@/lib/session";
import { csvHref, InsightsFilters, vatNote, vsLabel } from "../shared";

export const metadata = { title: "Customers" };

export default async function CustomerInsights({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(searchParams);
  const user = await getSession();
  const isAdmin = user?.role === "ADMIN";
  const [customers, top] = await Promise.all([insights<Customers>("customers", f), insights<Breakdown>("breakdown", f, { by: "customer", limit: 25 })]);
  const filters = <InsightsFilters f={f} controls={["compare", "province", "tier", "channel", "paymentMethod"]} />;
  if (!customers.ok) return <div className="space-y-4">{filters}<Unavailable message={customers.message} /></div>;
  const d = customers.data;
  const c = d.current;
  const vs = vsLabel(d);
  const tierTotal = c.tierMix.reduce((n, t) => n + t.revenue, 0);

  return (
    <div className="space-y-4">
      {filters}
      <TileGrid>
        <StatTile label="Paying customers" value={count(c.customers)} delta={d.change?.customers} vs={vs} note="Trade accounts count once per company" />
        <StatTile label="New customers" value={count(c.newCustomers)} delta={d.change?.newCustomers} vs={vs} note={`First paid order in this period · ${randCompact(c.newCustomerRevenue)}`} />
        <StatTile label="Returning customers" value={count(c.returningCustomers)} note={`${pct(c.repeatRate)} ordered twice or more in the period`} />
        <StatTile label="Revenue per customer" value={rand(c.revenuePerCustomer)} delta={d.change?.revenuePerCustomer} vs={vs} note="Materials + delivery" />
      </TileGrid>
      <Notices items={[vatNote(d), "Guest orders without an account aren't counted as customers here."]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="New and returning"
          subtitle="Customers who paid for an order in the period"
          table={
            <DataTable
              rows={[
                { k: "New customers", v: c.newCustomers, p: d.previous?.newCustomers },
                { k: "Returning customers", v: c.returningCustomers, p: d.previous?.returningCustomers },
                { k: "Ordered twice or more", v: c.repeatCustomers, p: d.previous?.repeatCustomers },
              ]}
              columns={[
                { key: "k", label: "", render: (r) => r.k },
                { key: "v", label: "This period", numeric: true, render: (r) => count(r.v) },
                ...(d.previous ? [{ key: "p", label: "Comparison", numeric: true, render: (r: { p?: number }) => count(r.p) }] : []),
              ]}
            />
          }
        >
          <BarList
            format={count}
            rows={[
              { label: "New customers", value: c.newCustomers },
              { label: "Returning customers", value: c.returningCustomers },
              { label: "Ordered twice or more", value: c.repeatCustomers },
            ]}
          />
        </ChartCard>
        <ChartCard title="Sales by customer tier" subtitle="The tier each order was priced at" csvHref={csvHref("breakdown", f, { by: "tier" })}>
          <BarList
            format={rand}
            rows={c.tierMix
              .sort((a, b) => b.revenue - a.revenue)
              .map((t) => ({ label: label("tier", t.tier), value: t.revenue, detail: `${tierTotal ? pct(Math.round((t.revenue / tierTotal) * 1000) / 10) : "—"} · ${count(t.orders)} orders` }))}
          />
        </ChartCard>
        <ChartCard title="Sign-ups" subtitle="New accounts and trade applications in the period">
          <dl className="grid grid-cols-2 gap-3 font-body text-sm">
            <div className="rounded-sm bg-limestone/60 p-3">
              <dt className="text-xs text-slate">Customer accounts</dt>
              <dd className="font-display text-xl font-semibold text-basalt">{count(d.signups.accounts)}</dd>
            </div>
            <div className="rounded-sm bg-limestone/60 p-3">
              <dt className="text-xs text-slate">Trade applications</dt>
              <dd className="font-display text-xl font-semibold text-basalt">{count(d.signups.tradeApplications)}</dd>
            </div>
          </dl>
        </ChartCard>
      </div>
      <ChartCard title="Top customers" subtitle="By material sales in the period" csvHref={csvHref("breakdown", f, { by: "customer", limit: "500" })}>
        <DataTable
          caption="Top customers"
          rows={top.ok ? top.data.rows : []}
          columns={[
            { key: "l", label: "Customer", render: (r) => <span>{r.label}<span className="block text-xs text-slate">{r.detail}</span></span> },
            { key: "r", label: "Sales", numeric: true, render: (r) => rand(r.revenue) },
            { key: "s", label: "Share", numeric: true, render: (r) => pct(r.share) },
            { key: "o", label: "Orders", numeric: true, render: (r) => count(r.orders) },
            { key: "g", label: "Growth", numeric: true, render: (r) => (r.growth === null ? "—" : `${r.growth > 0 ? "+" : ""}${r.growth}%`) },
            ...(isAdmin ? [{ key: "m", label: "Margin", numeric: true, render: (r: { grossMargin?: number | null }) => pct(r.grossMargin) }] : []),
          ]}
        />
      </ChartCard>
    </div>
  );
}
