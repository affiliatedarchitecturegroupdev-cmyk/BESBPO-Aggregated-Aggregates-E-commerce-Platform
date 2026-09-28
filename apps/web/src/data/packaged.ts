/**
 * CAT-10 (Cement & Hydraulic Binders) and CAT-11 (Mortars, Grouts &
 * Admixtures): packaged goods sold per bag, bulk bag, tanker load or drum.
 *
 * b2b-packaged-catalogue.json is an exact copy of
 * services/pricing/data/b2b_packaged_catalogue.json (the B2B pricing
 * workbook) — a pricing-service test fails if they drift. A unit is only
 * ever shown with a price when it is "Ready — benchmarked"; every other unit
 * shows why and routes to a quote (AGENTIC_RULES.md rules 1 and 10).
 */
import catalogue from "./b2b-packaged-catalogue.json";
import { CUSTOMER_TIERS, type CustomerTierName } from "./catalogue";

export type PackagedUnitCode = "BAG_25KG" | "BAG_50KG" | "BULK_BAG_1_5T" | "BULK_TANKER_PER_TON" | "DRUM_210L" | "IBC_TOTE_1000L";
export const READY = "Ready — benchmarked";

export type PackagedUnit = {
  unit: PackagedUnitCode;
  label: string;
  pricingStatus: string;
  sourceNote: string;
  /** Tier unit prices — only for a benchmarked unit. */
  prices: Record<CustomerTierName, number> | null;
};

export type PackagedProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  gradingStandard: string | null;
  typicalUses: string[];
  handlingNotes: string;
  units: PackagedUnit[];
  kind: "packaged";
};

/** List price less the tier discount, rounded half-up to the cent — as the pricing service does. */
function tierPrice(list: number, discount: number): number {
  return Math.round(Math.round(list * 100) * (1 - discount) + 1e-9) / 100;
}

export const PACKAGED_PRODUCTS: PackagedProduct[] = catalogue.products.map((p) => ({
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  categorySlug: p.category_slug,
  gradingStandard: p.grading_standard,
  typicalUses: p.typical_uses,
  handlingNotes: p.handling_notes,
  kind: "packaged",
  units: p.units.map((u) => ({
    unit: u.unit as PackagedUnitCode,
    label: u.unit_label,
    pricingStatus: u.pricing_status,
    sourceNote: u.source_note,
    prices:
      u.pricing_status === READY && u.list_price_per_unit !== null
        ? (Object.fromEntries(CUSTOMER_TIERS.map((t) => [t.name, tierPrice(u.list_price_per_unit as number, t.discount)])) as Record<CustomerTierName, number>)
        : null,
  })),
}));

export function findPackagedProduct(slug: string) {
  return PACKAGED_PRODUCTS.find((p) => p.slug === slug);
}

/** The first benchmarked unit, for "from" prices on cards. */
export function headlineUnit(product: PackagedProduct): PackagedUnit | undefined {
  return product.units.find((u) => u.prices !== null);
}

export const PACKAGED_UNIT_WEIGHT_KG: Partial<Record<PackagedUnitCode, number>> = catalogue.unit_weights_kg;
