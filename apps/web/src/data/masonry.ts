/**
 * Masonry, CAT-19 Bricks & Blocks and CAT-20 Lintels, DPC & Wall
 * Accessories (MASONRY_CATALOGUE.md): bricks per 1,000; blocks, lintels and
 * air bricks per item; damp-proof course per roll.
 *
 * masonry-catalogue.json is an exact copy of
 * services/pricing/data/masonry_catalogue.json — a pricing-service test fails
 * if they drift. A unit only shows a price when it is "Ready — benchmarked"
 * (at least two SA retailers' regular prices); every other unit goes to a
 * quote with the supplier (AGENTIC_RULES.md rules 1 and 10).
 */
import catalogue from "./masonry-catalogue.json";
import { CUSTOMER_TIERS } from "./catalogue";
import { READY, type TierPrices } from "./packaged";
import { tierPrice } from "@/lib/tier-pricing";

export type MasonryUnitCode = "THOUSAND" | "EACH" | "ROLL";

export type MasonryUnit = {
  unit: MasonryUnitCode;
  label: string;
  weightKg: number | null;
  pricingStatus: string;
  sourceNote: string;
  prices: TierPrices | null;
};

export type MasonryProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  gradingStandard: string | null;
  summary: string;
  masonryClass: string;
  unitSize: string | null;
  /** Units per m² of single-leaf wall with 10 mm joints (bricks and blocks only). */
  unitsPerM2: number | null;
  typicalUses: string[];
  handlingNotes: string;
  units: MasonryUnit[];
  kind: "masonry";
};

export const MASONRY_CATEGORY_CODES: Record<string, string> = Object.fromEntries(catalogue.categories.map((c) => [c.slug, c.code]));

export const MASONRY_PRODUCTS: MasonryProduct[] = catalogue.products.map((p) => ({
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  categorySlug: p.category_slug,
  gradingStandard: p.grading_standard,
  summary: p.description,
  masonryClass: p.masonry_class,
  unitSize: p.unit_size,
  unitsPerM2: p.units_per_m2,
  typicalUses: p.typical_uses,
  handlingNotes: p.handling_notes,
  kind: "masonry",
  units: p.units.map((u) => ({
    unit: u.unit as MasonryUnitCode,
    label: u.unit_label,
    weightKg: u.weight_kg,
    pricingStatus: u.pricing_status,
    sourceNote: u.source_note,
    prices:
      u.pricing_status === READY && u.list_price_per_unit !== null
        ? (Object.fromEntries(CUSTOMER_TIERS.map((t) => [t.name, tierPrice(u.list_price_per_unit as number, u.markup_percent / 100, "MASONRY", t.name)])) as TierPrices)
        : null,
  })),
}));

export function findMasonryProduct(slug: string) {
  return MASONRY_PRODUCTS.find((p) => p.slug === slug);
}

/** Bricks and blocks that a wall is built from — the wall calculator's choices. */
export const WALLING = MASONRY_PRODUCTS.filter((p) => p.unitsPerM2 !== null);

/** Allowance for breakage and cutting, added on top of the wall's count. */
export const BREAKAGE = 0.05;

/**
 * Units for a wall: area × units per m² of one leaf × leaves, plus the
 * breakage allowance, rounded up. Openings are subtracted by the caller.
 */
export function wallTakeOff(unitsPerM2: number, areaM2: number, leaves = 1) {
  const net = Math.max(0, areaM2) * unitsPerM2 * leaves;
  return { net: Math.ceil(net), withBreakage: Math.ceil(net * (1 + BREAKAGE)) };
}
