import type { PricingUnit } from "../pricing/pricing.service";

/**
 * AA 60/120 — express delivery of everyday building materials, within 120
 * minutes of sales confirming a supplier can load (docs/express-delivery.md).
 * Everything here is the server-side source of truth; the storefront only
 * displays what the API returns.
 */
export const EXPRESS = {
  /** VAT-inclusive, on top of the normal delivery fee. */
  feeRand: 1000,
  /** Loading prep once sales accepts, before the promise clock starts. */
  prepMinutes: 20,
  promiseMinutes: 120,
  /** The fee is refunded if delivery takes longer than this from the clock start (an hour late). */
  refundAfterMinutes: 180,
  /** The pin must be within this straight-line distance of the nearest supplier of every material. */
  radiusKm: 30,
  /** One rigid flatbed with a crane. */
  maxLoadKg: 5000,
  /** Orders are taken Monday to Saturday, 07:00 until the 15:00 cut-off, South African time. */
  openHour: 7,
  cutoffHour: 15,
} as const;

export type ExpressLine = { sku: string; categorySlug: string; unit: PricingUnit; quantity: number; equivalentTons?: number | null };

const AGGREGATE_CATEGORIES = [
  "sub-base-base-course",
  "crushed-stone",
  "sand-fine-aggregates",
  "crusher-run-road-building",
  "drainage-filter",
  "decorative-landscaping",
  "agricultural-industrial",
  "recycled-sustainable",
];

const SHEET_LENGTHS: Partial<Record<PricingUnit, number>> = { SHEET_3_0M: 3, SHEET_3_6M: 3.6, SHEET_4_2M: 4.2, SHEET_4_8M: 4.8, SHEET_6_0M: 6, SHEET_6_6M: 6.6 };

/**
 * What qualifies, by category and unit, with a conservative weight per unit
 * (kg) where the catalogue doesn't carry one. Bagged aggregates and cement,
 * bricks, blocks, lintels, DPC, small steel (6 m bars, brickforce and fixing
 * accessories) and roofing in standard lengths. Bulk loads, tankers, drums,
 * steel by the tonne or 12 m bar, mesh sheets, structural steel, cut-to-length
 * sheet, ready-mix and timber don't.
 */
function unitWeightKg(line: ExpressLine): number | null {
  const { categorySlug: c, unit, sku } = line;
  if (AGGREGATE_CATEGORIES.includes(c)) return unit === "bag" ? 25 : null;
  if (c === "cement-hydraulic-binders" || c === "mortars-grouts-admixtures") {
    return unit === "BAG_25KG" ? 25 : unit === "BAG_50KG" ? 50 : null;
  }
  if (c === "bricks-blocks") {
    if (unit === "THOUSAND") return /MAXI/.test(sku) ? 5000 : 3500;
    return unit === "EACH" ? 22 : null;
  }
  if (c === "lintels-dpc-wall-accessories") {
    const lintel = /LINTEL-(\d{4})/.exec(sku);
    if (unit === "EACH") return lintel ? (Number(lintel[1]) / 1000) * 20 : 3;
    return unit === "ROLL" ? 6 : null;
  }
  if (c === "reinforcing-bar") return unit === "LENGTH_6M" ? 15 : null;
  if (c === "mesh-brickforce") return unit === "ROLL" ? 6 : null;
  if (c === "steel-fixing-accessories") return ["EACH", "PACK", "ROLL", "COIL"].includes(unit) ? 10 : null;
  if (c === "roof-sheeting") return SHEET_LENGTHS[unit] !== undefined ? SHEET_LENGTHS[unit]! * 6 : null;
  if (c === "roof-flashings-fixings") return unit === "EACH" || unit === "PACK" ? 6 : null;
  if (c === "roof-insulation-rainwater") return unit === "ROLL" ? 20 : unit === "EACH" ? 6 : null;
  if (c === "concrete-roof-tiles") return unit === "EACH" ? 5 : null;
  return null;
}

export function qualifies(line: ExpressLine): boolean {
  return unitWeightKg(line) !== null;
}

/** Estimated load: the pricing service's mass where it has one (bags, steel), else the conservative unit weight. */
export function estimatedLoadKg(lines: ExpressLine[]): number {
  return Math.round(
    lines.reduce((kg, l) => {
      const known = l.equivalentTons ? l.equivalentTons * 1000 : 0;
      return kg + (known > 0 ? known : (unitWeightKg(l) ?? 0) * l.quantity);
    }, 0),
  );
}

/** Day of week (0 = Sunday) and hour/minute in South Africa (UTC+2 all year, no daylight saving). */
function sast(now: Date) {
  const t = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return { day: t.getUTCDay(), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

export function isWithinHours(now: Date): boolean {
  const { day, minutes } = sast(now);
  return day !== 0 && minutes >= EXPRESS.openHour * 60 && minutes < EXPRESS.cutoffHour * 60;
}

export type ExpressQuote = {
  available: boolean;
  /** Why it isn't, in plain words for the shopper. */
  reasons: string[];
  fee: number;
  prepMinutes: number;
  promiseMinutes: number;
  refundAfterMinutes: number;
  radiusKm: number;
  maxLoadKg: number;
  estimatedLoadKg: number;
  hours: string;
};

export const EXPRESS_HOURS = "Monday to Saturday, 07:00 to 15:00";

/**
 * Can this cart go AA 60/120? Every line must qualify, the order must be
 * priced (not quote-only), the delivery pin within 30 km of the nearest
 * supplier of every material, the load within one truck, and it must be
 * ordering hours.
 */
export function expressQuote(input: {
  lines: (ExpressLine & { name?: string })[];
  distance: { distanceKm: number; source: "LOCATION" | "CUSTOMER" };
  isQuoteOnly: boolean;
  now: Date;
}): ExpressQuote {
  const reasons: string[] = [];
  const excluded = input.lines.filter((l) => !qualifies(l));
  if (excluded.length > 0) {
    reasons.push(`${excluded.map((l) => l.name ?? l.sku).join(", ")} ${excluded.length === 1 ? "isn't" : "aren't"} on AA 60/120 — order ${excluded.length === 1 ? "it" : "them"} separately for standard delivery.`);
  }
  if (input.isQuoteOnly) reasons.push("This order needs a quote, so it can't go express.");
  if (input.distance.source !== "LOCATION") {
    reasons.push("Share your delivery location (not a typed distance) so we can check you're within 30 km of a partner supplier.");
  } else if (input.distance.distanceKm > EXPRESS.radiusKm) {
    reasons.push(`Your site is about ${Math.round(input.distance.distanceKm)} km from the nearest partner supplier — AA 60/120 covers sites within ${EXPRESS.radiusKm} km.`);
  }
  const load = estimatedLoadKg(input.lines);
  if (load > EXPRESS.maxLoadKg) {
    reasons.push(`At about ${(load / 1000).toFixed(1)} t, this load is more than one express truck carries (${EXPRESS.maxLoadKg / 1000} t) — split the order or use standard delivery.`);
  }
  if (!isWithinHours(input.now)) reasons.push(`AA 60/120 orders are taken ${EXPRESS_HOURS} — the 15:00 cut-off has passed or we're closed.`);
  return {
    available: reasons.length === 0,
    reasons,
    fee: EXPRESS.feeRand,
    prepMinutes: EXPRESS.prepMinutes,
    promiseMinutes: EXPRESS.promiseMinutes,
    refundAfterMinutes: EXPRESS.refundAfterMinutes,
    radiusKm: EXPRESS.radiusKm,
    maxLoadKg: EXPRESS.maxLoadKg,
    estimatedLoadKg: load,
    hours: EXPRESS_HOURS,
  };
}

const minutes = (n: number) => n * 60 * 1000;

/** Once sales accepts: prep, then the 120-minute promise; the fee is refundable 180 minutes after the clock starts. */
export function expressClock(acceptedAt: Date) {
  const clockStartsAt = new Date(acceptedAt.getTime() + minutes(EXPRESS.prepMinutes));
  return {
    clockStartsAt,
    dueAt: new Date(clockStartsAt.getTime() + minutes(EXPRESS.promiseMinutes)),
    refundAfter: new Date(clockStartsAt.getTime() + minutes(EXPRESS.refundAfterMinutes)),
  };
}

export type ExpressOutcome = "AWAITING_PAYMENT" | "AWAITING_ACCEPTANCE" | "IN_PROGRESS" | "ON_TIME" | "LATE" | "REFUND_DUE" | "DECLINED" | "CANCELLED";

/**
 * Where an express order stands. LATE = delivered after the 120 minutes but
 * within the hour's grace (no refund); REFUND_DUE = delivered more than an
 * hour late, or still undelivered past that point.
 */
export function expressOutcome(
  o: { status: string; expressFee: unknown; expressAcceptedAt: Date | null; expressDeclinedAt: Date | null },
  deliveredAt: Date | null,
  now: Date,
): ExpressOutcome | null {
  if (o.expressFee === null || o.expressFee === undefined) return null;
  if (o.expressDeclinedAt) return "DECLINED";
  if (o.status === "CANCELLED") return "CANCELLED";
  if (o.status === "PENDING") return "AWAITING_PAYMENT";
  if (!o.expressAcceptedAt) return "AWAITING_ACCEPTANCE";
  const { dueAt, refundAfter } = expressClock(o.expressAcceptedAt);
  const at = deliveredAt ?? (o.status === "DELIVERED" ? now : null);
  if (!at) return now > refundAfter ? "REFUND_DUE" : "IN_PROGRESS";
  if (at <= dueAt) return "ON_TIME";
  return at <= refundAfter ? "LATE" : "REFUND_DUE";
}
