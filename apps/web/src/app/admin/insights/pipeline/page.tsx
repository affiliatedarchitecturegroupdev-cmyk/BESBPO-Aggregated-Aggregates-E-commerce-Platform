import { ChartCard, DataTable, Funnel, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { count, insights, pct, rand, readFilters, type Pipeline, type SearchParams } from "@/lib/insights";
import { InsightsFilters } from "../shared";

export const metadata = { title: "Pipeline" };

const KIND: Record<string, string> = {
  PLANT_HIRE: "Plant hire",
  SITE_SERVICE: "Site services",
  BUSINESS_LINE: "Other business lines",
  JOB_PACK: "Job packs",
  ESTIMATE: "Project estimator",
  PARTNER_APPLICATION: "Partner applications",
};
const ENQUIRY_STATUS = ["NEW", "IN_PROGRESS", "QUOTED", "WON", "LOST", "CLOSED"] as const;
const QUOTE_STATUS: Record<string, string> = { SUBMITTED: "Awaiting a price", QUOTED: "Priced", ACCEPTED: "Accepted", DECLINED: "Declined", EXPIRED: "Expired" };
const change = (now: number, before: number | undefined) => (before === undefined ? undefined : before ? Math.round(((now - before) / before) * 1000) / 10 : null);

export default async function PipelineInsights({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(searchParams);
  const pipeline = await insights<Pipeline>("pipeline", f);
  const filters = <InsightsFilters f={f} controls={["compare"]} />;
  if (!pipeline.ok) return <div className="space-y-4">{filters}<Unavailable message={pipeline.message} /></div>;
  const p = pipeline.data;
  const vs = p.comparison ? (p.comparison.kind === "year" ? "last year" : "previous period") : undefined;
  const prev = p.previousCounts ?? undefined;
  const kinds = Object.entries(p.enquiriesByKind);

  return (
    <div className="space-y-4">
      {filters}
      <TileGrid>
        <StatTile label="Quote requests" value={count(p.counts.quoteRequests)} delta={change(p.counts.quoteRequests, prev?.quoteRequests)} vs={vs} />
        <StatTile label="Quote win rate" value={pct(p.quoteWinRate)} note="Accepted ÷ accepted or declined" />
        <StatTile label="Hours to price a quote" value={p.hoursToQuote.median === null ? "—" : count(p.hoursToQuote.median)} note={`Median · average ${p.hoursToQuote.average === null ? "—" : `${count(p.hoursToQuote.average)} h`}`} goodWhenUp={false} />
        <StatTile label="Enquiries" value={count(p.counts.enquiries)} delta={change(p.counts.enquiries, prev?.enquiries)} vs={vs} note="Hire, services, job packs, estimator" />
      </TileGrid>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Quote funnel" subtitle="Quote requests for bulk and long-distance orders">
          <Funnel
            stages={[
              { label: "Requested", value: p.counts.quoteRequests },
              { label: "Priced", value: p.counts.quotesPriced },
              { label: "Accepted", value: p.counts.quotesAccepted },
            ]}
          />
          <p className="mt-3 font-body text-xs text-slate">Priced and accepted count when that happened, so they can include requests from before the period.</p>
        </ChartCard>
        <ChartCard title="Hire booking funnel" subtitle="Bookings quoted in the period">
          <Funnel
            stages={[
              { label: "Quoted", value: p.bookingFunnel.created },
              { label: "Accepted by customer", value: p.bookingFunnel.accepted },
              { label: "Paid", value: p.bookingFunnel.paid },
              { label: "Completed", value: p.bookingFunnel.completed },
            ]}
          />
        </ChartCard>
        <ChartCard title="Quote requests by status" subtitle="Requests made in the period, by where they are now">
          <DataTable
            rows={Object.entries(p.quotesByStatus)}
            columns={[
              { key: "s", label: "Status", render: ([s]) => QUOTE_STATUS[s] ?? s },
              { key: "n", label: "Requests", numeric: true, render: ([, v]) => count(v.count) },
              { key: "v", label: "Value quoted", numeric: true, render: ([, v]) => (v.value ? rand(v.value) : "—") },
            ]}
          />
        </ChartCard>
        <ChartCard title="Enquiries by kind" subtitle="Received in the period, by where they are now">
          <DataTable
            rows={kinds}
            columns={[
              { key: "k", label: "Kind", render: ([k]) => KIND[k] ?? k },
              ...ENQUIRY_STATUS.map((s) => ({ key: s, label: s === "IN_PROGRESS" ? "In progress" : s.charAt(0) + s.slice(1).toLowerCase(), numeric: true, render: ([, v]: [string, Record<string, number>]) => count(v[s] ?? 0) })),
              { key: "t", label: "Total", numeric: true, render: ([, v]) => count(Object.values(v).reduce((n, x) => n + x, 0)) },
            ]}
          />
        </ChartCard>
      </div>
    </div>
  );
}
