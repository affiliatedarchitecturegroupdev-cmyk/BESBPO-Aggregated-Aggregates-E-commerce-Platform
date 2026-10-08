import Link from "next/link";
import { BarList, ChartCard, DataTable, Notices, Unavailable, type Column } from "@/components/insights/Parts";
import { count, insights, label, pageQuery, pct, rand, readFilters, type Breakdown, type BreakdownRow, type SearchParams } from "@/lib/insights";
import { getSession } from "@/lib/session";
import { csvHref, InsightsFilters, vatNote } from "../shared";

export const metadata = { title: "Products & categories" };

const SORTS = [
  { value: "revenue", label: "Sales" },
  { value: "orders", label: "Orders" },
  { value: "growth", label: "Growth" },
  { value: "grossProfit", label: "Gross profit", adminOnly: true },
] as const;

const growth = (r: BreakdownRow) => (r.growth === null ? "—" : `${r.growth > 0 ? "+" : ""}${r.growth}%`);

export default async function ProductInsights({ searchParams }: { searchParams: SearchParams }) {
  const f = readFilters(searchParams);
  const user = await getSession();
  const isAdmin = user?.role === "ADMIN";
  const sortParam = typeof searchParams.sort === "string" ? searchParams.sort : "revenue";
  const sort = SORTS.find((s) => s.value === sortParam && (isAdmin || !("adminOnly" in s))) ? sortParam : "revenue";
  const [products, categories, families] = await Promise.all([
    insights<Breakdown>("breakdown", f, { by: "product", sort, limit: 100 }),
    insights<Breakdown>("breakdown", f, { by: "category" }),
    insights<Breakdown>("breakdown", f, { by: "family" }),
  ]);
  const filters = <InsightsFilters f={f} controls={["compare", "businessLine", "family", "category", "province", "tier", "channel", "paymentMethod"]} />;
  if (!products.ok) return <div className="space-y-4">{filters}<Unavailable message={products.message} /></div>;
  const p = products.data;

  const columns: Column<BreakdownRow>[] = [
    { key: "label", label: "Product", render: (r) => <span>{r.label}<span className="block text-xs text-slate">{r.detail}</span></span> },
    { key: "revenue", label: "Sales", numeric: true, render: (r) => rand(r.revenue) },
    { key: "share", label: "Share", numeric: true, render: (r) => pct(r.share) },
    { key: "qty", label: "Quantity", numeric: true, render: (r) => count(r.quantity) },
    { key: "orders", label: "Orders", numeric: true, render: (r) => count(r.orders) },
    ...(p.rows.some((r) => r.previousRevenue !== null) ? [{ key: "growth", label: "Growth", numeric: true, render: growth }] : []),
    ...(isAdmin
      ? [
          { key: "cogs", label: "Cost of goods", numeric: true, render: (r: BreakdownRow) => rand(r.cogs) },
          { key: "gp", label: "Gross profit", numeric: true, render: (r: BreakdownRow) => rand(r.grossProfit) },
          { key: "gm", label: "Margin", numeric: true, render: (r: BreakdownRow) => pct(r.grossMargin) },
        ]
      : []),
  ];

  const groupTable = (data: typeof categories, group: "family" | null, by: string, title: string) => (
    <ChartCard
      title={title}
      csvHref={csvHref("breakdown", f, { by })}
      table={
        <DataTable
          rows={data.ok ? data.data.rows : []}
          columns={[
            { key: "l", label: "Group", render: (r) => (group ? label(group, r.key) : r.label) },
            { key: "r", label: "Sales", numeric: true, render: (r) => rand(r.revenue) },
            { key: "s", label: "Share", numeric: true, render: (r) => pct(r.share) },
            { key: "o", label: "Orders", numeric: true, render: (r) => count(r.orders) },
            { key: "g", label: "Growth", numeric: true, render: growth },
            ...(isAdmin ? [{ key: "m", label: "Margin", numeric: true, render: (r: BreakdownRow) => pct(r.grossMargin) }] : []),
          ]}
        />
      }
    >
      <BarList
        format={rand}
        rows={(data.ok ? data.data.rows : []).map((r) => ({
          label: group ? label(group, r.key) : r.label,
          value: r.revenue,
          detail: `${pct(r.share)} of sales${isAdmin && r.grossMargin !== undefined ? ` · margin ${pct(r.grossMargin)}` : ""}`,
          href: by === "category" ? `/admin/insights/products?${pageQuery(f, { category: r.key })}` : by === "family" && r.key !== "UNKNOWN" ? `/admin/insights/products?${pageQuery(f, { family: r.key })}` : undefined,
        }))}
      />
    </ChartCard>
  );

  return (
    <div className="space-y-4">
      {filters}
      <Notices items={[vatNote(p), "Product figures are material sales only — delivery fees, refunds and hire belong to whole orders and bookings.", isAdmin && "Gross profit here is sales less cost of goods; delivery costs are in the P&L."]} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Top 10 products" subtitle={`By ${SORTS.find((s) => s.value === sort)?.label.toLowerCase()}`}>
          <BarList
            format={(n) => (sort === "orders" ? count(n) : sort === "growth" ? `${n > 0 ? "+" : ""}${n}%` : rand(n))}
            rows={p.rows.slice(0, 10).map((r) => ({
              label: r.label,
              value: sort === "orders" ? r.orders : sort === "growth" ? (r.growth ?? 0) : sort === "grossProfit" ? (r.grossProfit ?? 0) : r.revenue,
              detail: `${r.detail ?? ""} · ${pct(r.share)} of sales`,
            }))}
          />
        </ChartCard>
        <div className="grid min-w-0 gap-4">
          {groupTable(categories, null, "category", "By category")}
          {groupTable(families, "family", "family", "By product family")}
        </div>
      </div>
      <ChartCard
        title="Every product sold"
        subtitle={`${p.rows.length} products and units of sale · total ${rand(p.total)}`}
        csvHref={csvHref("breakdown", f, { by: "product", sort, limit: "500" })}
        action={
          <span className="flex flex-wrap gap-2">
            Sort by
            {SORTS.filter((s) => isAdmin || !("adminOnly" in s)).map((s) => (
              <Link key={s.value} href={`/admin/insights/products?${pageQuery(f, { sort: s.value })}`} aria-current={s.value === sort ? "true" : undefined} className={s.value === sort ? "font-semibold text-basalt" : "text-seam-blue hover:underline"}>
                {s.label}
              </Link>
            ))}
          </span>
        }
      >
        <DataTable caption="Sales by product" rows={p.rows} columns={columns} />
      </ChartCard>
    </div>
  );
}
