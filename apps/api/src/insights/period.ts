/**
 * Reporting periods for the insights engine (ANALYTICS.md). Dates are South
 * African calendar days (SAST, UTC+2, no daylight saving); a period runs from
 * 00:00 on `from` to 24:00 on `to`, as UTC instants for querying.
 */
export const TZ = "Africa/Johannesburg";
const SAST_OFFSET = "+02:00";
const DAY_MS = 86_400_000;

export type Granularity = "day" | "week" | "month";
export type Compare = "previous" | "year" | "none";
export type Period = { from: string; to: string; start: Date; end: Date; days: number };

const isoDay = (d: Date) => new Date(d.getTime() + 2 * 3_600_000).toISOString().slice(0, 10); // SAST calendar day of an instant

export function todaySast(now: Date = new Date()): string {
  return isoDay(now);
}

export function period(from: string, to: string): Period {
  const start = new Date(`${from}T00:00:00${SAST_OFFSET}`);
  const end = new Date(new Date(`${to}T00:00:00${SAST_OFFSET}`).getTime() + DAY_MS);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new RangeError("Invalid date.");
  if (end <= start) throw new RangeError("The end date can't be before the start date.");
  return { from, to, start, end, days: Math.round((end.getTime() - start.getTime()) / DAY_MS) };
}

/** Default period: the last 30 days including today. */
export function defaultPeriod(now: Date = new Date()): Period {
  const to = todaySast(now);
  const from = isoDay(new Date(new Date(`${to}T00:00:00${SAST_OFFSET}`).getTime() - 29 * DAY_MS));
  return period(from, to);
}

/** The period to compare with: the same length immediately before, or the same dates a year earlier. */
export function comparisonPeriod(p: Period, compare: Compare): Period | null {
  if (compare === "none") return null;
  if (compare === "year") {
    const shift = (d: string) => `${Number(d.slice(0, 4)) - 1}${d.slice(4)}`.replace(/-02-29$/, "-02-28");
    return period(shift(p.from), shift(p.to));
  }
  const end = new Date(p.start.getTime() - DAY_MS);
  const start = new Date(p.start.getTime() - p.days * DAY_MS);
  return period(isoDay(start), isoDay(end));
}

/** Days for up to ~2 months, weeks up to ~8 months, months beyond. */
export function autoGranularity(p: Period): Granularity {
  if (p.days <= 62) return "day";
  if (p.days <= 245) return "week";
  return "month";
}

/** Every bucket key in the period (YYYY-MM-DD of the bucket's first day; weeks start Monday), so empty buckets show as zero. */
export function bucketKeys(p: Period, g: Granularity): string[] {
  const keys: string[] = [];
  const first = new Date(`${p.from}T00:00:00Z`);
  const last = new Date(`${p.to}T00:00:00Z`);
  let cursor = new Date(first);
  if (g === "week") cursor = new Date(cursor.getTime() - ((cursor.getUTCDay() + 6) % 7) * DAY_MS);
  if (g === "month") cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1));
  while (cursor <= last) {
    keys.push(cursor.toISOString().slice(0, 10));
    if (g === "day") cursor = new Date(cursor.getTime() + DAY_MS);
    else if (g === "week") cursor = new Date(cursor.getTime() + 7 * DAY_MS);
    else cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return keys;
}

/**
 * VAT basis (ANALYTICS.md): reports are ex VAT. Once finance confirms that
 * storefront prices include VAT (PRICES_INCLUDE_VAT=true), customer-facing
 * amounts and costs derived from those prices are divided by 1.15. Until
 * then they're reported as charged, and the response says so.
 */
export const VAT_RATE = 0.15;
export function vatBasis(env: string | undefined = process.env.PRICES_INCLUDE_VAT): { basis: "EX_VAT" | "AS_CHARGED"; divisor: number } {
  return (env ?? "").trim().toLowerCase() === "true" ? { basis: "EX_VAT", divisor: 1 + VAT_RATE } : { basis: "AS_CHARGED", divisor: 1 };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Percentage change, or null when there's nothing to compare against. */
export function change(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  return round2(((current - previous) / Math.abs(previous)) * 100);
}
