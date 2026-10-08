import { TrendChart } from "@/components/insights/Charts";
import { BarList, ChartCard, DataTable, Funnel, Notices, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { bucketLabel, count, insights, pct, rand, randCompact, readFilters, type Hire, type Pipeline, type SearchParams, type Timeseries } from "@/lib/insights";
import { getSession } from "@/lib/session";
import { InsightsFilters, vatNote, vsLabel } from "../shared";

export const metadata = { title: "Hire & services" };

const STATUS: Record<string, string> = {
  QUOTED: "Quoted",
  AWAITING_PAYMENT: "Awaiting payment",
  DISPATCHING: "Finding a partner",
  ACCEPTED: "Partner assigned",
  IN_PROGRESS: "On site",
  COMPLETED: "Completed",
  CLOSED: "Closed (paid out)",
  DISPUTED: "Disputed",
  UNFULFILLED: "Unfulfilled",
  DECLINED: "Declined by customer",
  CANCELLED: "Cancelled",
};

export default async function HireInsights({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(searchParams);
  const user = await getSession();
  const isAdmin = user?.role === "ADMIN";
  const hf = { ...f, businessLine: "HIRE" };
  const [hire, series, pipeline] = await Promise.all([insights<Hire>("hire", f), insights<Timeseries>("timeseries", hf), insights<Pipeline>("pipeline", f)]);
  const filters = <InsightsFilters f={f} controls={["compare", "granularity", "province"]} />;
  if (!hire.ok) return <div className="space-y-4">{filters}<Unavailable message={hire.message} /></div>;
  const h = hire.data;
  const vs = vsLabel(h);
  const g = series.ok ? series.data.granularity : "day";
  const buckets = series.ok ? series.data.buckets : [];
  const prevName = h.comparison ? (h.comparison.kind === "year" ? "Last year" : "Previous period") : null;
  const funnel = pipeline.ok ? pipeline.data.bookingFunnel : null;

  return (
    <div className="space-y-4">
      {filters}
      <TileGrid>
        <StatTile label="Paid bookings" value={count(h.paid.bookings)} delta={h.change?.bookings} vs={vs} />
        <StatTile label="Booking value" value={randCompact(h.paid.hireGrossValue)} delta={h.change?.hireGrossValue} vs={vs} note="What customers paid" />
        <StatTile label="Commission" value={randCompact(h.paid.hireCommission)} delta={h.change?.hireCommission} vs={vs} note="Our revenue (agent model)" />
        <StatTile label="Fill rate" value={pct(h.paid.fillRate)} note={`${count(h.paid.unfulfilled)} unfulfilled · ${h.paid.averageMinutesToAssign === null ? "—" : `${count(h.paid.averageMinutesToAssign)} min`} to assign`} />
      </TileGrid>
      <Notices
        items={[
          vatNote(h),
          "Booking value is what customers paid; the partner's share passes through to them. Cancelled bookings are left out.",
          isAdmin && h.partnerPayouts && `Partner payouts outstanding: ${rand(h.partnerPayouts.held)} held (dispute window or dispute) and ${rand(h.partnerPayouts.due)} due.`,
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Hire commission"
          subtitle={prevName ? `Against ${prevName.toLowerCase()}` : undefined}
          table={
            <DataTable
              rows={buckets}
              columns={[
                { key: "k", label: "Period", render: (b) => bucketLabel(b.key, g) },
                { key: "b", label: "Bookings", numeric: true, render: (b) => count(b.current.bookings) },
                { key: "v", label: "Booking value", numeric: true, render: (b) => rand(b.current.hireGrossValue) },
                { key: "c", label: "Commission", numeric: true, render: (b) => rand(b.current.hireCommission) },
              ]}
            />
          }
        >
          <TrendChart format="rand" currentName="This period" previousName={prevName} data={buckets.map((b) => ({ label: bucketLabel(b.key, g), current: b.current.hireCommission, previous: b.previous?.hireCommission ?? null }))} />
        </ChartCard>
        <ChartCard title="Booking funnel" subtitle="Bookings quoted in the period, and how far they got">
          {funnel ? (
            <Funnel
              stages={[
                { label: "Quoted", value: funnel.created },
                { label: "Accepted by customer", value: funnel.accepted },
                { label: "Paid", value: funnel.paid },
                { label: "Completed", value: funnel.completed },
              ]}
            />
          ) : (
            <p className="font-body text-sm text-slate">Unavailable.</p>
          )}
          <p className="mt-3 font-body text-xs text-slate">
            Partner offer acceptance: {pct(h.offerAcceptanceRate)}
            {funnel ? ` · ${count(funnel.declined)} declined by the customer` : ""}
          </p>
        </ChartCard>
        <ChartCard title="Most-booked items" subtitle="Paid bookings by item">
          <BarList format={rand} rows={h.items.map((i) => ({ label: i.name, value: i.hireGrossValue, detail: `${count(i.bookings)} bookings · ${rand(i.hireCommission)} commission` }))} />
        </ChartCard>
        <ChartCard title="By province" subtitle="Paid booking value by site province">
          <BarList format={rand} rows={h.provinces.map((p) => ({ label: p.province, value: p.hireGrossValue, detail: `${count(p.bookings)} bookings · ${rand(p.hireCommission)} commission` }))} />
        </ChartCard>
        <ChartCard title="Bookings by status" subtitle="Bookings quoted in the period, by where they are now">
          <DataTable
            rows={Object.entries(h.createdByStatus).sort((a, b) => b[1] - a[1])}
            columns={[
              { key: "s", label: "Status", render: ([s]) => STATUS[s] ?? s },
              { key: "n", label: "Bookings", numeric: true, render: ([, n]) => count(n) },
            ]}
          />
        </ChartCard>
      </div>
      <ChartCard title="Partner league" subtitle="Partners assigned to jobs in the period">
        <DataTable
          caption="Partner league"
          rows={h.partners}
          empty="No partners were assigned jobs in this period."
          columns={[
            { key: "n", label: "Partner", render: (p) => p.name },
            { key: "j", label: "Jobs", numeric: true, render: (p) => count(p.jobs) },
            { key: "c", label: "Completed", numeric: true, render: (p) => count(p.completed) },
            { key: "d", label: "Disputed", numeric: true, render: (p) => count(p.disputed) },
            { key: "r", label: "Rating", numeric: true, render: (p) => (p.averageRating === null ? "—" : `${p.averageRating} / 5`) },
            { key: "a", label: "Offers accepted", numeric: true, render: (p) => pct(p.acceptanceRate) },
            { key: "t", label: "Minutes to accept", numeric: true, render: (p) => count(p.averageMinutesToAccept) },
            ...(isAdmin ? [{ key: "p", label: "Payouts", numeric: true, render: (p: { partnerPayouts?: number }) => rand(p.partnerPayouts) }] : []),
          ]}
        />
      </ChartCard>
    </div>
  );
}
