/**
 * Admin → Delivery rates (ROADMAP 9.1 and 9.2, docs/delivery-rates.md): the standard tipper delivery rates and the
 * flatbed fees for products the supplier delivers on its own truck. Stored in SiteContent; the API sends them to
 * the pricing service with every price, so checkout, the cart, quote requests and sales quotations all use them.
 * Pure, so it is unit-tested without a database.
 */
export const LOAD_SIZES = ["M3_6", "M3_10", "M3_14_PLUS"] as const;
export type LoadSize = (typeof LOAD_SIZES)[number];
/** The tipper bands with a fee. 0–30 km is included in the price; beyond 100 km is quoted. Distances are fixed. */
export const FEE_BANDS = ["BAND_30_60", "BAND_60_100"] as const;
export type FeeBand = (typeof FEE_BANDS)[number];
/** The product lines delivered on the supplier's own flatbed or crane truck. */
export const FLATBED_LINES = ["steel", "masonry", "roofing", "supplies"] as const;
export type FlatbedLine = (typeof FLATBED_LINES)[number];
/** The flatbed fee bands, the same distances as tipper loads. */
export const FLATBED_BANDS = ["0–30 km", "30–60 km", "60–100 km"] as const;

export type FlatbedRate = { fees: [number, number, number]; freeFrom: number | null };

export type DeliveryRates = {
  bandFees: Record<FeeBand, Record<LoadSize, number>>;
  smallLoadFee: number;
  baggedFee: number;
  baggedFreeFromKg: number;
  minBulkM3: number;
  minBulkTons: number;
  /** Lines without an entry keep R0 at checkout, their charge confirmed before dispatch. */
  flatbed: Partial<Record<FlatbedLine, FlatbedRate>>;
};

/** The pricing framework workbook's rates (services/pricing/data/pricing_framework.json) — used until staff save their own. */
export const WORKBOOK_RATES: DeliveryRates = {
  bandFees: { BAND_30_60: { M3_6: 450, M3_10: 650, M3_14_PLUS: 950 }, BAND_60_100: { M3_6: 850, M3_10: 1200, M3_14_PLUS: 1800 } },
  smallLoadFee: 350,
  baggedFee: 350,
  baggedFreeFromKg: 1000,
  minBulkM3: 3,
  minBulkTons: 5,
  flatbed: {},
};

export const FLATBED_LINE_LABEL: Record<FlatbedLine, string> = {
  steel: "Steel & reinforcing",
  masonry: "Bricks, blocks, paving & precast",
  roofing: "Roofing & timber",
  supplies: "Building supplies",
};

const MAX_FEE = 100_000;

/** Rates as typed, checked: every fee a rand amount from 0 to R100,000, the thresholds sensible. Throws with a plain reason. */
export function normaliseDeliveryRates(input: unknown): DeliveryRates {
  const o = (input ?? {}) as Record<string, unknown>;
  const money = (value: unknown, what: string) => {
    const n = Number(value);
    if (value === null || value === "" || !Number.isFinite(n) || n < 0 || n > MAX_FEE) throw new Error(`${what} must be an amount from R0 to R100,000.`);
    return Math.round(n * 100) / 100;
  };
  const positive = (value: unknown, what: string, max: number) => {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > max) throw new Error(`${what} must be more than 0 and at most ${max.toLocaleString("en-ZA")}.`);
    return Math.round(n * 100) / 100;
  };
  const bands = (o.bandFees ?? {}) as Record<string, Record<string, unknown>>;
  const bandFees = Object.fromEntries(
    FEE_BANDS.map((b) => [b, Object.fromEntries(LOAD_SIZES.map((s) => [s, money(bands[b]?.[s], `The ${b === "BAND_30_60" ? "30–60" : "60–100"} km fee for ${s.replace("M3_", "").replace("_PLUS", "+")} m³`)]))]),
  ) as DeliveryRates["bandFees"];
  const flatbedIn = (o.flatbed ?? {}) as Record<string, unknown>;
  const flatbed: DeliveryRates["flatbed"] = {};
  for (const line of FLATBED_LINES) {
    const rate = flatbedIn[line] as { fees?: unknown[]; freeFrom?: unknown } | null | undefined;
    if (!rate) continue;
    if (!Array.isArray(rate.fees) || rate.fees.length !== 3) throw new Error(`${FLATBED_LINE_LABEL[line]}: give a fee for each distance band.`);
    const fees = rate.fees.map((f, i) => money(f, `${FLATBED_LINE_LABEL[line]}, ${FLATBED_BANDS[i]}`)) as FlatbedRate["fees"];
    const freeFrom = rate.freeFrom === null || rate.freeFrom === undefined || rate.freeFrom === "" ? null : positive(rate.freeFrom, `${FLATBED_LINE_LABEL[line]}: free delivery from`, 10_000_000);
    flatbed[line] = { fees, freeFrom };
  }
  return {
    bandFees,
    smallLoadFee: money(o.smallLoadFee, "The small-load fee"),
    baggedFee: money(o.baggedFee, "The bagged-goods fee"),
    baggedFreeFromKg: positive(o.baggedFreeFromKg, "Bagged goods deliver free from (kg)", 100_000),
    minBulkM3: positive(o.minBulkM3, "The full-load minimum (m³)", 50),
    minBulkTons: positive(o.minBulkTons, "The full-load minimum (tons)", 80),
    flatbed,
  };
}

/** What the pricing service takes (`delivery_rates` on /calculate/order and /calculate/delivery-fee). */
export function pricingPayload(r: DeliveryRates) {
  return {
    band_fees: r.bandFees,
    small_load_fee: r.smallLoadFee,
    bagged_fee: r.baggedFee,
    bagged_free_from_kg: r.baggedFreeFromKg,
    min_bulk_m3: r.minBulkM3,
    min_bulk_tons: r.minBulkTons,
    flatbed: Object.fromEntries(Object.entries(r.flatbed).map(([line, rate]) => [line, { fees: rate!.fees, free_from: rate!.freeFrom }])),
  };
}
