import { email, formatZAR, siteUrl, type Block, type EmailMessage } from "../notifications/notification-templates";

/**
 * The weekly insights email (ANALYTICS.md, Phase 4): last week's headline
 * figures against the week before, best sellers, provinces, hire and
 * pipeline, and anything that makes the profit figures incomplete. Admins
 * only — it carries cost and profit.
 */

const DAY_MS = 86_400_000;
const sastDay = (d: Date) => new Date(d.getTime() + 2 * 3_600_000).toISOString().slice(0, 10);

/** The Monday-to-Sunday week before the one `now` falls in (SAST). */
export function previousWeek(now: Date = new Date()): { from: string; to: string } {
  const today = sastDay(now);
  const t = Date.parse(`${today}T00:00:00Z`);
  const monday = t - ((new Date(t).getUTCDay() + 6) % 7) * DAY_MS;
  return { from: new Date(monday - 7 * DAY_MS).toISOString().slice(0, 10), to: new Date(monday - DAY_MS).toISOString().slice(0, 10) };
}

/** Whether the weekly email is due: from Monday 07:00 SAST, for the rest of that week (so a missed Monday still sends). */
export function digestDue(now: Date = new Date()): boolean {
  const sast = new Date(now.getTime() + 2 * 3_600_000);
  const weekday = (sast.getUTCDay() + 6) % 7; // Monday = 0
  return weekday > 0 || sast.getUTCHours() >= 7;
}

export type DigestData = {
  from: string;
  to: string;
  vatBasis: "EX_VAT" | "AS_CHARGED";
  current: DigestMetrics;
  previous: DigestMetrics | null;
  products: { label: string; detail: string | null; revenue: number; share: number }[];
  provinces: { label: string; revenue: number; share: number }[];
  pipeline: { enquiries: number; quoteRequests: number; quotesPriced: number; quotesAccepted: number; bookingsQuoted: number };
};

export type DigestMetrics = {
  netRevenue: number;
  materialsRevenue: number;
  deliveryRevenue: number;
  hireCommission: number;
  hireGrossValue: number;
  refunds: number;
  orders: number;
  bookings: number;
  averageOrderValue: number;
  grossProfit?: number;
  grossMargin?: number | null;
  operatingCosts?: number | null;
  netProfit?: number | null;
  linesMissingCost?: number;
  deliveriesMissingCost?: number;
  operatingCostMonthsMissing?: string[] | null;
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Spelled out rather than toLocaleDateString: Node's en-ZA data differs between versions.
const day = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const pctText = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${Math.round(n * 10) / 10}%`);

function changeText(now: number, before: number | null | undefined): string {
  if (before === null || before === undefined) return "";
  if (before === 0) return now === 0 ? " (no change)" : " (none the week before)";
  const pct = Math.round(((now - before) / Math.abs(before)) * 1000) / 10;
  return ` (${pct > 0 ? "▲ +" : pct < 0 ? "▼ " : ""}${pct}% on the week before)`;
}

export function weeklyInsightsEmail(d: DigestData): EmailMessage {
  const c = d.current;
  const p = d.previous;
  const money = (k: keyof DigestMetrics) => formatZAR(Number(c[k] ?? 0)) + changeText(Number(c[k] ?? 0), p ? Number(p[k] ?? 0) : null);
  const link = `${siteUrl()}/admin/insights?range=custom&from=${d.from}&to=${d.to}`;
  const warnings: string[] = [];
  if (d.vatBasis === "AS_CHARGED") warnings.push("Amounts are as charged — they'll be excluding VAT once storefront prices are confirmed VAT-inclusive.");
  if ((c.linesMissingCost ?? 0) > 0) warnings.push(`${c.linesMissingCost} order lines have no cost recorded, so gross profit is overstated.`);
  if ((c.deliveriesMissingCost ?? 0) > 0) warnings.push(`${c.deliveriesMissingCost} dispatched deliveries have no delivery cost.`);
  if (c.operatingCostMonthsMissing?.length) warnings.push(`No operating costs entered for ${c.operatingCostMonthsMissing.join(", ")} — net profit is overstated.`);

  const blocks: Block[] = [
    { kind: "p", text: `Here's how ${day(d.from)} – ${day(d.to)} went, compared with the week before.` },
    { kind: "h", text: "Sales" },
    {
      kind: "rows",
      rows: [
        ["Net revenue", money("netRevenue")],
        ["Material sales", money("materialsRevenue")],
        ["Delivery fees", formatZAR(c.deliveryRevenue)],
        ["Paid orders", `${c.orders}${changeText(c.orders, p?.orders)}`],
        ["Average order", formatZAR(c.averageOrderValue)],
        ["Hire commission", `${formatZAR(c.hireCommission)} on ${c.bookings} paid booking${c.bookings === 1 ? "" : "s"} (${formatZAR(c.hireGrossValue)} booking value)`],
        ...(c.refunds > 0 ? ([["Refunds paid", formatZAR(c.refunds)]] as [string, string][]) : []),
      ],
    },
    { kind: "h", text: "Profit" },
    {
      kind: "rows",
      rows: [
        ["Gross profit", `${money("grossProfit")}`],
        ["Gross margin", pctText(c.grossMargin)],
        ["Operating costs (week's share)", c.operatingCosts === null || c.operatingCosts === undefined ? "—" : formatZAR(c.operatingCosts)],
        ["Net profit", c.netProfit === null || c.netProfit === undefined ? "—" : money("netProfit")],
      ],
    },
    { kind: "h", text: "Best sellers" },
    d.products.length
      ? { kind: "list", items: d.products.map((r) => `${r.label}${r.detail ? ` (${r.detail})` : ""} — ${formatZAR(r.revenue)}, ${pctText(r.share)} of material sales`) }
      : { kind: "p", text: "No material sales last week." },
    ...(d.provinces.length ? [{ kind: "h" as const, text: "Top provinces" }, { kind: "list" as const, items: d.provinces.map((r) => `${r.label} — ${formatZAR(r.revenue)} (${pctText(r.share)})`) }] : []),
    { kind: "h", text: "Pipeline" },
    {
      kind: "rows",
      rows: [
        ["Quote requests", String(d.pipeline.quoteRequests)],
        ["Quotes priced / accepted", `${d.pipeline.quotesPriced} / ${d.pipeline.quotesAccepted}`],
        ["Hire, service and job-pack enquiries", String(d.pipeline.enquiries)],
        ["Hire bookings quoted", String(d.pipeline.bookingsQuoted)],
      ],
    },
    ...(warnings.length ? [{ kind: "h" as const, text: "Before you rely on these numbers" }, { kind: "list" as const, items: warnings }] : []),
    { kind: "cta", label: "Open last week in Insights", href: link },
  ];
  return email(
    `Last week: ${formatZAR(c.netRevenue)} net revenue, ${c.orders} order${c.orders === 1 ? "" : "s"} (${day(d.from)} – ${day(d.to)})`,
    blocks,
    "Aggregated Aggregates — weekly summary for admins. It includes cost and profit figures: please don't forward it. Switch it off on Admin → Notifications.",
  );
}
