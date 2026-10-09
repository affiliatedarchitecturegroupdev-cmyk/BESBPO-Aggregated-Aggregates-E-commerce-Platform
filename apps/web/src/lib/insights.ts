import "server-only";
import { api, type ApiResult } from "@/lib/api";
import { sessionToken } from "@/lib/session";

/**
 * Admin → Insights (ANALYTICS.md, Phase 3). Pages read the analytics engine
 * (/insights/*) with one shared filter set, carried in the page's query
 * string so every tab, chart and CSV download shows the same slice.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export const FILTER_KEYS = ["range", "from", "to", "compare", "granularity", "businessLine", "family", "category", "province", "tier", "channel", "paymentMethod"] as const;
export type Filters = Partial<Record<(typeof FILTER_KEYS)[number], string>>;

export const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "mtd", label: "Month to date" },
  { value: "last-month", label: "Last month" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ytd", label: "Year to date" },
  { value: "12m", label: "Last 12 months" },
  { value: "custom", label: "Custom dates" },
] as const;

export const LABELS = {
  businessLine: { ALL: "Materials & hire", MATERIALS: "Materials", HIRE: "Hire & services" },
  family: { AGGREGATE: "Aggregates", CEMENT_BAGGED: "Cement (bagged)", CEMENT_BULK: "Cement (bulk)", READY_MIX: "Ready-mix concrete", STEEL: "Steel", UNKNOWN: "Not recorded" },
  tier: { RETAIL: "Retail", CONTRACTOR_TRADE: "Contractor / Trade", VOLUME_CIVIL_BULK: "Volume / Civil / Bulk", UNKNOWN: "Not recorded" },
  channel: { WEBSITE: "Website", WHATSAPP: "WhatsApp", INSTAGRAM_REFERRAL: "Instagram referral", FACEBOOK_REFERRAL: "Facebook referral" },
  paymentMethod: {
    CARD: "Card",
    INSTANT_EFT: "Instant EFT",
    CAPITEC_PAY: "Capitec Pay",
    APPLE_PAY: "Apple Pay",
    GOOGLE_PAY: "Google Pay",
    SAMSUNG_PAY: "Samsung Pay",
    ZAPPER: "Zapper",
    SNAPSCAN: "SnapScan",
    MOBICRED: "Mobicred",
    MORETYME: "MoreTyme",
    PAYFLEX: "Payflex",
    PAYJUSTNOW: "PayJustNow",
    HAPPY_PAY: "HappyPay",
    FLOAT: "Float",
    OZOW: "Ozow",
    STITCH: "Stitch",
    LULAPAY: "Lulapay",
    EFT_PO: "EFT / purchase order",
    UNKNOWN: "Not recorded",
  },
  compare: { previous: "Previous period", year: "Same period last year", none: "No comparison" },
  granularity: { "": "Automatic", day: "Daily", week: "Weekly", month: "Monthly" },
} as const;

export function label(group: keyof typeof LABELS, key: string | null | undefined): string {
  if (!key) return "—";
  return (LABELS[group] as Record<string, string>)[key] ?? key.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const sastToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
const shift = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Resolves a preset (or custom dates) to SAST calendar days. */
export function resolveRange(f: Filters): { from: string; to: string; range: string } {
  const today = sastToday();
  const [y, m] = today.split("-").map(Number);
  const range = f.range && RANGES.some((r) => r.value === f.range) ? f.range : f.from || f.to ? "custom" : "30d";
  const monthStart = (yy: number, mm: number) => new Date(Date.UTC(yy, mm - 1, 1)).toISOString().slice(0, 10);
  switch (range) {
    case "7d":
      return { from: shift(today, -6), to: today, range };
    case "90d":
      return { from: shift(today, -89), to: today, range };
    case "mtd":
      return { from: monthStart(y, m), to: today, range };
    case "last-month":
      return { from: monthStart(y, m - 1), to: shift(monthStart(y, m), -1), range };
    case "qtd":
      return { from: monthStart(y, Math.floor((m - 1) / 3) * 3 + 1), to: today, range };
    case "ytd":
      return { from: monthStart(y, 1), to: today, range };
    case "12m":
      return { from: monthStart(y, m - 11), to: today, range };
    case "custom": {
      const to = f.to && DATE.test(f.to) ? f.to : today;
      const from = f.from && DATE.test(f.from) ? f.from : shift(to, -29);
      return { from, to, range };
    }
    default:
      return { from: shift(today, -29), to: today, range: "30d" };
  }
}

export function readFilters(searchParams: SearchParams): Filters {
  const out: Filters = {};
  for (const key of FILTER_KEYS) {
    const v = searchParams[key];
    const value = Array.isArray(v) ? v[0] : v;
    if (value) out[key] = value.slice(0, 80);
  }
  return out;
}

/** The query string for the API (presets resolved to dates). */
export function apiQuery(f: Filters, extra: Record<string, string | number | undefined> = {}): string {
  const { from, to } = resolveRange(f);
  const params = new URLSearchParams({ from, to });
  for (const key of ["compare", "granularity", "businessLine", "family", "category", "province", "tier", "channel", "paymentMethod"] as const) {
    if (f[key] && f[key] !== "ALL") params.set(key, f[key]!);
  }
  for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== "") params.set(k, String(v));
  return params.toString();
}

/** The page's own query string (filters as chosen, presets unresolved) — for tab links and CSV downloads. */
export function pageQuery(f: Filters, extra: Record<string, string | undefined> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) params.set(k, v);
  return params.toString();
}

export function insights<T>(path: string, f: Filters, extra: Record<string, string | number | undefined> = {}): Promise<ApiResult<T>> {
  return api<T>(`/insights/${path}?${apiQuery(f, extra)}`, { token: sessionToken() });
}

// ---------------------------------------------------------------------------
// Response shapes (admin-only fields are optional: the API removes them for staff)
// ---------------------------------------------------------------------------

export type Meta = {
  period: { from: string; to: string; days: number };
  comparison: { from: string; to: string; kind: string } | null;
  vatBasis: "EX_VAT" | "AS_CHARGED";
  filters: Record<string, string>;
  includes: { materials: boolean; deliveryAndRefunds: boolean; hire: boolean; operatingCosts: boolean };
};

export type Metrics = {
  materialsRevenue: number;
  deliveryRevenue: number;
  hireGrossValue: number;
  hireCommission: number;
  refunds: number;
  hireRefunds: number;
  netRevenue: number;
  orders: number;
  orderLines: number;
  bookings: number;
  averageOrderValue: number;
  cogs?: number;
  deliveryCost?: number;
  grossProfit?: number;
  grossMargin?: number | null;
  operatingCosts?: number | null;
  operatingCostsByCategory?: Record<string, number> | null;
  netProfit?: number | null;
  operatingCostMonthsMissing?: string[] | null;
  linesMissingCost?: number;
  linesEstimated?: number;
  deliveriesMissingCost?: number;
};

export type PipelineCounts = { enquiries: number; quoteRequests: number; quotesPriced: number; quotesAccepted: number; bookingsQuoted: number };

export type Summary = Meta & { current: Metrics; previous: Metrics | null; change: Record<string, number | null>; pipeline: PipelineCounts };
export type Timeseries = Meta & { granularity: "day" | "week" | "month"; buckets: { key: string; current: Metrics; previousKey: string | null; previous: Metrics | null }[] };
export type BreakdownRow = {
  key: string;
  label: string;
  detail: string | null;
  revenue: number;
  orders: number;
  lines: number;
  quantity: number | null;
  share: number;
  previousRevenue: number | null;
  growth: number | null;
  cogs?: number;
  grossProfit?: number;
  grossMargin?: number | null;
  linesMissingCost?: number;
};
export type Breakdown = Meta & { by: string; sort: string; total: number; rows: BreakdownRow[] };

export type PaidBookings = { bookings: number; hireGrossValue: number; hireCommission: number; partnerAssigned: number; unfulfilled: number; fillRate: number | null; averageMinutesToAssign: number | null };
export type Hire = Meta & {
  createdByStatus: Record<string, number>;
  paid: PaidBookings;
  previousPaid: PaidBookings | null;
  change: { hireGrossValue: number | null; hireCommission: number | null; bookings: number | null } | null;
  offerAcceptanceRate: number | null;
  items: { sku: string; name: string; bookings: number; hireGrossValue: number; hireCommission: number }[];
  provinces: { province: string; bookings: number; hireGrossValue: number; hireCommission: number }[];
  partners: { id: string; name: string; jobs: number; completed: number; disputed: number; averageRating: number | null; acceptanceRate: number | null; averageMinutesToAccept: number | null; partnerPayouts?: number }[];
  partnerPayouts?: { held: number; due: number };
};

export type Pipeline = Meta & {
  counts: PipelineCounts;
  previousCounts: PipelineCounts | null;
  enquiriesByKind: Record<string, Record<string, number>>;
  quotesByStatus: Record<string, { count: number; value: number }>;
  quoteWinRate: number | null;
  hoursToQuote: { median: number | null; average: number | null };
  bookingFunnel: { created: number; accepted: number; paid: number; completed: number; declined: number };
};

export type CustomerStats = {
  customers: number;
  newCustomers: number;
  returningCustomers: number;
  repeatCustomers: number;
  repeatRate: number | null;
  revenue: number;
  newCustomerRevenue: number;
  revenuePerCustomer: number;
  tierMix: { tier: string; revenue: number; orders: number }[];
};
export type Customers = Meta & {
  current: CustomerStats;
  previous: CustomerStats | null;
  change: { customers: number | null; newCustomers: number | null; revenuePerCustomer: number | null } | null;
  signups: { accounts: number; tradeApplications: number };
};

export type Marketing = Meta & {
  promotions: {
    impressions: number;
    clicks: number;
    clickThroughRate: number | null;
    daily: { day: string; impressions: number; clicks: number }[];
    rows: { id: string; title: string; slot: string; isActive: boolean; impressions: number; clicks: number; clickThroughRate: number | null }[];
  };
  newsletter: { signups: number; bySource: Record<string, number>; byAudience: Record<string, number> };
  channels: { key: string; label: string; revenue: number; orders: number }[];
};

export type PnlMonth = {
  month: string;
  materialsRevenue: number;
  deliveryRevenue: number;
  hireCommission: number;
  refunds: number;
  netRevenue: number;
  cogs: number;
  deliveryCost: number;
  grossProfit: number;
  grossMargin: number | null;
  operatingCosts: number;
  operatingCostsByCategory: Record<string, number>;
  netProfit: number;
  operatingCostsRecorded: boolean;
  orders: number;
  bookings: number;
  hireGrossValue: number;
  hireRefunds: number;
  linesMissingCost: number;
  linesEstimated: number;
  deliveriesMissingCost: number;
};
export type Pnl = {
  vatBasis: "EX_VAT" | "AS_CHARGED";
  from: string;
  to: string;
  months: PnlMonth[];
  totals: { materialsRevenue: number; deliveryRevenue: number; hireCommission: number; refunds: number; netRevenue: number; cogs: number; deliveryCost: number; grossProfit: number; operatingCosts: number; netProfit: number; grossMargin: number | null };
};

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

const RAND = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const COUNT = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export const rand = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n < 0 ? "-" : ""}R${RAND.format(Math.abs(n))}`);
export const count = (n: number | null | undefined) => (n === null || n === undefined ? "—" : COUNT.format(n));
export const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${COUNT.format(n)}%`);

/** Compact rand for stat tiles: R1,284 · R12.9k · R4.2m. */
export function randCompact(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}R${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}m`;
  if (a >= 100_000) return `${sign}R${(a / 1000).toFixed(0)}k`;
  if (a >= 10_000) return `${sign}R${(a / 1000).toFixed(1)}k`;
  return `${sign}R${RAND.format(a)}`;
}

export function formatDay(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", { ...opts, timeZone: "UTC" });
}

export function periodLabel(m: Pick<Meta, "period">) {
  return `${formatDay(m.period.from)} – ${formatDay(m.period.to)}`;
}

/** Bucket label for charts and tables. */
export function bucketLabel(key: string, g: "day" | "week" | "month") {
  if (g === "month") return formatDay(key, { month: "short", year: "numeric" });
  if (g === "week") return `w/c ${formatDay(key, { day: "numeric", month: "short" })}`;
  return formatDay(key, { day: "numeric", month: "short" });
}
