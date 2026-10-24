import Link from "next/link";
import { ColumnChart } from "@/components/insights/Charts";
import { ChartCard, DataTable, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { SynonymForm } from "@/components/admin/SynonymForm";
import { api } from "@/lib/api";
import { count, formatDay, insights, pct, readFilters, type CatalogueGap, type SearchInsights, type SearchParams, type SynonymGroup } from "@/lib/insights";
import { sessionToken } from "@/lib/session";
import { InsightsFilters } from "../shared";
import { deleteSynonym, updateGap } from "./actions";

export const metadata = { title: "Search & gaps" };

const STATUSES = { OPEN: "Open", ADDED: "Added", IGNORED: "Ignored" } as const;
type Status = keyof typeof STATUSES;
const SOURCE = { SEARCH: "Search found nothing", BOQ: "BOQ line not matched" } as const;

/**
 * Admin → Insights → Search & gaps (docs/search-insights.md): what shoppers search for, the searches that find
 * nothing, catalogue gaps from searches and bills of quantities for staff to work through, and the synonym
 * groups staff add so search understands more words — all counts, nothing about who searched.
 */
export default async function SearchInsightsPage({ searchParams }: { searchParams: SearchParams & { gaps?: string; source?: string } }) {
  const f = readFilters(searchParams);
  const status: Status = (searchParams.gaps as Status) in STATUSES ? (searchParams.gaps as Status) : "OPEN";
  const source = searchParams.source === "SEARCH" || searchParams.source === "BOQ" ? searchParams.source : undefined;
  const token = sessionToken();
  const [report, gaps, synonyms] = await Promise.all([
    insights<SearchInsights>("search", f),
    api<CatalogueGap[]>(`/discovery/gaps?status=${status}${source ? `&source=${source}` : ""}&limit=200`, { token }),
    api<SynonymGroup[]>("/discovery/staff/synonyms", { token }),
  ]);
  const filters = <InsightsFilters f={f} controls={[]} />;
  if (!report.ok) return <div className="space-y-4">{filters}<Unavailable message={report.message} /></div>;
  const r = report.data;
  const daily = r.daily.map((d) => ({ label: formatDay(d.day, { day: "numeric", month: "short" }), ...d }));
  const gapHref = (changes: { gaps?: string; source?: string }) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && v && k !== "gaps" && k !== "source") params.set(k, v);
    const next = { gaps: status, source, ...changes };
    if (next.gaps && next.gaps !== "OPEN") params.set("gaps", next.gaps);
    if (next.source) params.set("source", next.source);
    return `?${params.toString()}#gaps`;
  };
  const productsLink = (q: string) => (
    <Link href={`/products?q=${encodeURIComponent(q)}`} className="text-seam-blue hover:underline" target="_blank">
      {q}
    </Link>
  );

  return (
    <div className="space-y-4">
      {filters}
      <TileGrid>
        <StatTile label="Searches" value={count(r.totals.searches)} note={`${count(r.totals.distinctTerms)} different terms`} />
        <StatTile label="Searches that found nothing" value={count(r.totals.zeroResults)} note={`${pct(r.totals.zeroResultRate)} of searches`} />
        <StatTile label="Open gaps from searches" value={count(r.totals.openGaps.SEARCH ?? 0)} />
        <StatTile label="Open gaps from BOQs" value={count(r.totals.openGaps.BOQ ?? 0)} note="Lines no product matched" />
      </TileGrid>
      <ChartCard
        title="Searches per day"
        subtitle="Searches submitted on the product listing and site search — not each keystroke"
        table={
          <DataTable
            rows={r.daily}
            columns={[
              { key: "d", label: "Day", render: (d) => formatDay(d.day) },
              { key: "s", label: "Searches", numeric: true, render: (d) => count(d.searches) },
              { key: "z", label: "Found nothing", numeric: true, render: (d) => count(d.zeroResults) },
            ]}
          />
        }
      >
        <ColumnChart
          format="count"
          series={[
            { key: "searches", name: "Searches" },
            { key: "zeroResults", name: "Found nothing", color: "#eb6834" },
          ]}
          data={daily}
        />
      </ChartCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top searches" subtitle="The 50 most searched terms in the period">
          <DataTable
            caption="Top searches"
            rows={r.top}
            empty="No searches in this period."
            columns={[
              { key: "q", label: "Search", render: (t) => productsLink(t.query) },
              { key: "s", label: "Searches", numeric: true, render: (t) => count(t.searches) },
              { key: "r", label: "Results now", numeric: true, render: (t) => (t.lastResults === 0 ? <span className="text-red-700">none</span> : count(t.lastResults)) },
            ]}
          />
        </ChartCard>
        <ChartCard title="Searches that found nothing" subtitle="Add the product, or a synonym if we stock it under another name">
          <DataTable
            caption="Zero-result searches"
            rows={r.zero}
            empty="Every search found something in this period."
            columns={[
              { key: "q", label: "Search", render: (t) => productsLink(t.query) },
              { key: "z", label: "Found nothing", numeric: true, render: (t) => count(t.zeroResults) },
              { key: "r", label: "Now", render: (t) => (t.lastResults === 0 ? "Still nothing" : `Fixed — ${count(t.lastResults)} results`) },
            ]}
          />
        </ChartCard>
      </div>

      <section id="gaps" className="rounded-sm border border-basalt/10 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-basalt">Catalogue gaps</h3>
            <p className="mt-1 max-w-3xl font-body text-xs text-slate">
              What customers asked for that we couldn&apos;t show them, most asked for first — from searches that found nothing and bill-of-quantities lines that matched no product. Mark one
              added once the product is in the catalogue; if it keeps coming back unmatched it opens again. Every gap since the start, not just this period.
            </p>
          </div>
          <nav aria-label="Gap filters" className="flex flex-wrap gap-2 font-body text-xs">
            {(Object.keys(STATUSES) as Status[]).map((s) => (
              <Link key={s} href={gapHref({ gaps: s })} aria-current={s === status ? "true" : undefined} className={`rounded-full border px-3 py-1 ${s === status ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt hover:border-seam-blue"}`}>
                {STATUSES[s]}
              </Link>
            ))}
            <span className="mx-1 text-basalt/30">|</span>
            {[undefined, "SEARCH", "BOQ"].map((s) => (
              <Link key={s ?? "all"} href={gapHref({ source: s })} aria-current={s === source ? "true" : undefined} className={`rounded-full border px-3 py-1 ${s === source ? "border-basalt bg-basalt text-limestone" : "border-basalt/20 text-basalt hover:border-basalt"}`}>
                {s === "SEARCH" ? "Searches" : s === "BOQ" ? "BOQs" : "All sources"}
              </Link>
            ))}
          </nav>
        </div>
        {!gaps.ok ? (
          <p className="mt-4 font-body text-sm text-red-800">{gaps.message}</p>
        ) : gaps.data.length === 0 ? (
          <p className="mt-4 font-body text-sm text-slate">No {STATUSES[status].toLowerCase()} gaps{source ? " from this source" : ""}.</p>
        ) : (
          <ul className="mt-4 divide-y divide-basalt/5">
            {gaps.data.map((g) => (
              <li key={g.id} className="grid gap-3 py-3 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-body text-sm text-basalt">
                    {g.source === "SEARCH" ? productsLink(g.text) : g.text}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase text-slate">
                    {SOURCE[g.source]} · {count(g.count)}× · last {formatDay(g.lastSeen.slice(0, 10))}
                    {g.source === "BOQ" && (
                      <>
                        {" · "}
                        <Link href="/admin/quotes" className="text-seam-blue hover:underline">
                          quote requests
                        </Link>
                      </>
                    )}
                  </p>
                  {g.note && <p className="mt-1 font-body text-xs text-slate">Note: {g.note}</p>}
                </div>
                <form action={updateGap} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={g.id} />
                  <input name="note" maxLength={500} defaultValue={g.note ?? ""} placeholder="Note (optional)" aria-label={`Note for ${g.text}`} className="w-44 rounded-sm border border-basalt/20 px-2 py-1 font-body text-xs" />
                  {g.status !== "ADDED" && (
                    <button name="status" value="ADDED" className="rounded-sm bg-seam-blue px-3 py-1 font-body text-xs font-semibold text-limestone hover:bg-basalt">
                      Added
                    </button>
                  )}
                  {g.status !== "IGNORED" && (
                    <button name="status" value="IGNORED" className="rounded-sm border border-basalt/20 px-3 py-1 font-body text-xs text-basalt hover:bg-limestone">
                      Ignore
                    </button>
                  )}
                  {g.status !== "OPEN" && (
                    <button name="status" value="OPEN" className="rounded-sm border border-basalt/20 px-3 py-1 font-body text-xs text-basalt hover:bg-limestone">
                      Reopen
                    </button>
                  )}
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="synonyms" className="rounded-sm border border-basalt/10 bg-white p-5">
        <h3 className="font-display text-lg font-bold text-basalt">Synonyms</h3>
        <p className="mt-1 max-w-3xl font-body text-xs text-slate">
          When shoppers call something by another name — &quot;jojo&quot; for a water tank, &quot;klip&quot; for stone — add a group here and search treats the words as the same thing. These add to the built-in trade
          terms (about 60 groups, docs/search.md); search uses a new group within a minute.
        </p>
        <div className="mt-4 max-w-2xl">
          <SynonymForm />
        </div>
        {!synonyms.ok ? (
          <p className="mt-4 font-body text-sm text-red-800">{synonyms.message}</p>
        ) : synonyms.data.length === 0 ? (
          <p className="mt-4 font-body text-sm text-slate">No staff synonyms yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-basalt/5">
            {synonyms.data.map((s) => (
              <li key={s.id} className="grid gap-2 py-3 md:grid-cols-[1fr_auto] md:items-start">
                <SynonymForm id={s.id} terms={s.terms} />
                <form action={deleteSynonym} className="md:pt-5">
                  <input type="hidden" name="id" value={s.id} />
                  <button className="font-body text-xs text-red-700 hover:underline">Delete</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
