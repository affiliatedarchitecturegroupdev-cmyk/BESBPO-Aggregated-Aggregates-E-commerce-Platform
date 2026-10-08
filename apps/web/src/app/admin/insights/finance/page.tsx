import Link from "next/link";
import { notFound } from "next/navigation";
import { GroupedColumns } from "@/components/insights/Charts";
import { BarList, ChartCard, Notices, StatTile, TileGrid, Unavailable } from "@/components/insights/Parts";
import { api } from "@/lib/api";
import { formatDay, pageQuery, pct, rand, randCompact, readFilters, resolveRange, type Pnl, type PnlMonth, type SearchParams } from "@/lib/insights";
import { getSession, sessionToken } from "@/lib/session";
import { csvHref, InsightsFilters, vatNote } from "../shared";

export const metadata = { title: "Profit & loss" };

const CATEGORIES: Record<string, string> = {
  SALARIES: "Salaries & wages",
  RENT: "Rent & premises",
  MARKETING: "Marketing & advertising",
  SOFTWARE: "Software & hosting",
  VEHICLES: "Vehicles & fuel",
  PROFESSIONAL_FEES: "Professional fees",
  BANK_CHARGES: "Bank & card charges",
  INSURANCE: "Insurance",
  OTHER: "Other",
};
const MONTHS = [6, 12, 24] as const;
const monthLabel = (m: string) => formatDay(`${m}-01`, { month: "short", year: "numeric" });

type Line = { label: string; value: (m: PnlMonth) => number | null; total: number | null; strong?: boolean; negative?: boolean; indent?: boolean; percent?: boolean };

/**
 * Admin-only monthly management P&L (not statutory accounts): revenue, cost of
 * goods, delivery cost, gross profit, operating costs by category, net profit.
 */
export default async function PnlPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSession();
  if (user?.role !== "ADMIN") notFound();
  const f = readFilters(searchParams);
  const monthsParam = Number(searchParams.months);
  const months = MONTHS.includes(monthsParam as (typeof MONTHS)[number]) ? monthsParam : 12;
  const { to } = resolveRange(f);
  const res = await api<Pnl>(`/insights/pnl?to=${to}&months=${months}`, { token: sessionToken() });
  if (!res.ok) return <Unavailable message={res.message} />;
  const p = res.data;
  const t = p.totals;
  const categories = [...new Set(p.months.flatMap((m) => Object.keys(m.operatingCostsByCategory)))].sort((a, b) => Object.keys(CATEGORIES).indexOf(a) - Object.keys(CATEGORIES).indexOf(b));
  const sumCat = (c: string) => p.months.reduce((n, m) => n + (m.operatingCostsByCategory[c] ?? 0), 0);
  const missingOpex = p.months.filter((m) => !m.operatingCostsRecorded).map((m) => monthLabel(m.month));
  const missingCost = p.months.reduce((n, m) => n + m.linesMissingCost, 0);
  const missingDelivery = p.months.reduce((n, m) => n + m.deliveriesMissingCost, 0);

  const lines: Line[] = [
    { label: "Material sales", value: (m) => m.materialsRevenue, total: t.materialsRevenue, indent: true },
    { label: "Delivery fees", value: (m) => m.deliveryRevenue, total: t.deliveryRevenue, indent: true },
    { label: "Hire commission", value: (m) => m.hireCommission, total: t.hireCommission, indent: true },
    { label: "Refunds", value: (m) => -m.refunds, total: -t.refunds, indent: true, negative: true },
    { label: "Net revenue", value: (m) => m.netRevenue, total: t.netRevenue, strong: true },
    { label: "Cost of goods", value: (m) => -m.cogs, total: -t.cogs, indent: true, negative: true },
    { label: "Delivery cost", value: (m) => -m.deliveryCost, total: -t.deliveryCost, indent: true, negative: true },
    { label: "Gross profit", value: (m) => m.grossProfit, total: t.grossProfit, strong: true },
    { label: "Gross margin", value: (m) => m.grossMargin, total: t.grossMargin, percent: true, indent: true },
    ...categories.map((c) => ({ label: CATEGORIES[c] ?? c, value: (m: PnlMonth) => -(m.operatingCostsByCategory[c] ?? 0), total: -sumCat(c), indent: true, negative: true })),
    { label: "Operating costs", value: (m) => -m.operatingCosts, total: -t.operatingCosts, negative: true },
    { label: "Net profit", value: (m) => m.netProfit, total: t.netProfit, strong: true },
  ];
  const fmt = (v: number | null, line: Line) => (line.percent ? pct(v) : v === null ? "—" : v === 0 && line.negative ? "—" : rand(v));

  return (
    <div className="space-y-4">
      <InsightsFilters f={f} controls={[]} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-basalt/10 bg-white p-3 font-body text-sm">
        <p className="text-slate">
          {monthLabel(p.months[0].month)} – {monthLabel(p.months[p.months.length - 1].month)} · months ending with the period&apos;s end date ({formatDay(to)})
        </p>
        <span className="flex items-center gap-2 text-xs">
          Show
          {MONTHS.map((n) => (
            <Link key={n} href={`/admin/insights/finance?${pageQuery(f, { months: String(n) })}`} aria-current={n === months ? "true" : undefined} className={n === months ? "font-semibold text-basalt" : "text-seam-blue hover:underline"}>
              {n} months
            </Link>
          ))}
        </span>
      </div>
      <TileGrid>
        <StatTile label="Net revenue" value={randCompact(t.netRevenue)} />
        <StatTile label="Gross profit" value={randCompact(t.grossProfit)} note={`Margin ${pct(t.grossMargin)}`} />
        <StatTile label="Operating costs" value={randCompact(t.operatingCosts)} />
        <StatTile label="Net profit" value={randCompact(t.netProfit)} note={t.netRevenue ? `${pct(Math.round((t.netProfit / t.netRevenue) * 1000) / 10)} of net revenue` : undefined} />
      </TileGrid>
      <Notices
        items={[
          vatNote(p),
          "A management view for decisions, not statutory accounts. Card and gateway fees aren't deducted yet.",
          missingOpex.length > 0 && (
            <>
              No operating costs entered for {missingOpex.join(", ")} — net profit for those months is overstated. Add them on <Link className="underline" href="/admin/finance">Finance</Link>.
            </>
          ),
          missingCost > 0 && `${missingCost} order lines have no cost recorded, so gross profit is overstated by their cost.`,
          missingDelivery > 0 && `${missingDelivery} dispatched deliveries have no delivery cost recorded.`,
        ]}
      />
      <ChartCard title="Profit by month" subtitle="Gross profit, and net profit after operating costs">
        <GroupedColumns
          format="rand"
          series={[
            { key: "gross", name: "Gross profit" },
            { key: "net", name: "Net profit", color: "#1baf7a" },
          ]}
          data={p.months.map((m) => ({ label: monthLabel(m.month), gross: m.grossProfit, net: m.netProfit }))}
        />
      </ChartCard>
      <ChartCard title="Monthly P&L" subtitle="Amounts in rand; costs shown as negatives" csvHref={csvHref("pnl", f, { months: String(months) })}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse font-body text-sm">
            <caption className="sr-only">Monthly management profit and loss</caption>
            <thead>
              <tr className="border-b border-basalt/10 text-xs text-slate">
                <th scope="col" className="sticky left-0 bg-white px-2 py-2 text-left font-medium">
                  Line
                </th>
                {p.months.map((m) => (
                  <th key={m.month} scope="col" className="px-2 py-2 text-right font-medium">
                    {monthLabel(m.month)}
                    {!m.operatingCostsRecorded && <span className="block font-normal text-ochre-gold">no costs entered</span>}
                  </th>
                ))}
                <th scope="col" className="px-2 py-2 text-right font-semibold text-basalt">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.label} className={line.strong ? "border-y border-basalt/10 bg-limestone/50 font-semibold" : "border-b border-basalt/5"}>
                  <th scope="row" className={`sticky left-0 px-2 py-1.5 text-left font-[inherit] text-basalt ${line.strong ? "bg-limestone" : "bg-white"} ${line.indent ? "pl-5 font-normal" : ""}`}>
                    {line.label}
                  </th>
                  {p.months.map((m) => (
                    <td key={m.month} className="px-2 py-1.5 text-right tabular-nums text-basalt">
                      {fmt(line.value(m), line)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-basalt">{fmt(line.total, line)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
      {categories.length > 0 && (
        <ChartCard title="Operating costs by category" subtitle="Over the months shown">
          <BarList format={rand} rows={categories.map((c) => ({ label: CATEGORIES[c] ?? c, value: sumCat(c) })).sort((a, b) => b.value - a.value)} />
        </ChartCard>
      )}
    </div>
  );
}
