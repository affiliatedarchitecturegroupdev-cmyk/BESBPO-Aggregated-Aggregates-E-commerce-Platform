/**
 * CAT-12 Ready-Mix Concrete — sold per m³ by strength grade, in at least a
 * full mixer-truck load, with pump hire priced separately
 * (READY_MIX_CATALOGUE.md).
 *
 * ready-mix-catalogue.json is an exact copy of
 * services/pricing/data/ready_mix_catalogue.json — a pricing-service test
 * fails if they drift. A grade only shows a price when it is "Ready —
 * benchmarked"; every other grade, and every pump until a written supplier
 * quote is loaded, goes to a quote (AGENTIC_RULES.md rule 1).
 */
import catalogue from "./ready-mix-catalogue.json";
import { CUSTOMER_TIERS } from "./catalogue";
import type { TierPrices } from "./packaged";
import { tierPrice } from "@/lib/tier-pricing";

export const READY = "Ready — benchmarked";
export const READY_MIX_CATEGORY = catalogue.category;

export type ReadyMixUnit = { unit: "m3"; label: string; pricingStatus: string; sourceNote: string; prices: TierPrices | null };

export type ReadyMixProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  gradingStandard: string | null;
  strengthGradeMPa: number;
  mixType: string;
  minimumLoadM3: number;
  listPricePerM3: number | null;
  markupPercent: number;
  pricingStatus: string;
  sourceNote: string;
  typicalUses: string[];
  handlingNotes: string;
  /** One unit — per m³ — so listings and the cart treat it like any other product. */
  units: [ReadyMixUnit];
  kind: "ready-mix";
};

export type PumpOption = {
  code: string;
  name: string;
  pumpType: string;
  boomLengthM: number | null;
  capacityM3PerHr: number | null;
  callOutFee: number | null;
  ratePerM3: number | null;
  pricingStatus: string;
  sourceNote: string;
};

export const READY_MIX_PRODUCTS: ReadyMixProduct[] = catalogue.products.map((p) => {
  const priced = p.pricing_status === READY && p.list_price_per_m3 !== null;
  const prices = priced
    ? (Object.fromEntries(
        CUSTOMER_TIERS.map((t) => [t.name, tierPrice(p.list_price_per_m3 as number, p.markup_percent / 100, "READY_MIX", t.name)]),
      ) as TierPrices)
    : null;
  return {
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categorySlug: p.category_slug,
    gradingStandard: p.grading_standard,
    strengthGradeMPa: p.strength_grade_mpa,
    mixType: p.mix_type,
    minimumLoadM3: p.minimum_load_m3,
    listPricePerM3: p.list_price_per_m3,
    markupPercent: p.markup_percent,
    pricingStatus: p.pricing_status,
    sourceNote: p.source_note,
    typicalUses: p.typical_uses,
    handlingNotes: p.handling_notes,
    units: [{ unit: "m3", label: "m³", pricingStatus: p.pricing_status, sourceNote: p.source_note, prices }],
    kind: "ready-mix",
  };
});

export const PUMP_OPTIONS: PumpOption[] = catalogue.pumps.map((p) => ({
  code: p.code,
  name: p.name,
  pumpType: p.pump_type,
  boomLengthM: p.boom_length_m,
  capacityM3PerHr: p.capacity_m3_per_hr,
  callOutFee: p.call_out_fee,
  ratePerM3: p.rate_per_m3,
  pricingStatus: p.pricing_status,
  sourceNote: p.source_note,
}));

export function findReadyMix(slug: string) {
  return READY_MIX_PRODUCTS.find((p) => p.slug === slug);
}

export function isPumpPriced(pump: PumpOption) {
  return pump.pricingStatus === READY && (pump.callOutFee !== null || pump.ratePerM3 !== null);
}
