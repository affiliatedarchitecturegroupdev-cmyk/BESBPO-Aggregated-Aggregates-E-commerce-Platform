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
import { CUSTOMER_TIERS } from "./catalogue";
import { packagedFamily, tierPrice } from "@/lib/tier-pricing";

export type PackagedUnitCode = "BAG_25KG" | "BAG_50KG" | "BULK_BAG_1_5T" | "BULK_TANKER_PER_TON" | "DRUM_210L" | "IBC_TOTE_1000L";
export const READY = "Ready — benchmarked";

export type PackagedUnit = {
  unit: PackagedUnitCode;
  label: string;
  pricingStatus: string;
  sourceNote: string;
  /** Tier unit prices — only for a benchmarked unit; a tier whose price is quoted is null. */
  prices: TierPrices | null;
};

/** Retail always has a price; a trade or volume price is null when that tier is quoted. */
export type TierPrices = { RETAIL: number; CONTRACTOR_TRADE: number | null; VOLUME_CIVIL_BULK: number | null };

/** The cement taxonomy, carried as product attributes (CEMENT_MASTER_CATALOGUE.md). */
export type CementAttributes = {
  manufacturer: string | null;
  brand: string | null;
  cementFamily: string | null;
  cementClass: string | null;
  cementType: string | null;
  regionNote: string | null;
  specialistCharacteristics: string[];
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
} & CementAttributes;

export const PACKAGED_PRODUCTS: PackagedProduct[] = catalogue.products.map((p) => ({
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  categorySlug: p.category_slug,
  gradingStandard: p.grading_standard,
  typicalUses: p.typical_uses,
  handlingNotes: p.handling_notes,
  kind: "packaged",
  manufacturer: p.manufacturer ?? null,
  brand: p.brand ?? null,
  cementFamily: p.cement_family ?? null,
  cementClass: p.cement_class ?? null,
  cementType: p.cement_type ?? null,
  regionNote: p.region_note ?? null,
  specialistCharacteristics: p.specialist_characteristics ?? [],
  units: p.units.map((u) => ({
    unit: u.unit as PackagedUnitCode,
    label: u.unit_label,
    pricingStatus: u.pricing_status,
    sourceNote: u.source_note,
    prices:
      u.pricing_status === READY && u.list_price_per_unit !== null
        ? (Object.fromEntries(
            CUSTOMER_TIERS.map((t) => [t.name, tierPrice(u.list_price_per_unit as number, u.markup_percent / 100, packagedFamily(u.unit), t.name)]),
          ) as TierPrices)
        : null,
  })),
}));

export function findPackagedProduct(slug: string) {
  return PACKAGED_PRODUCTS.find((p) => p.slug === slug);
}

/** The first benchmarked unit, for "from" prices on cards. */
export function headlineUnit<U extends { prices: TierPrices | null }>(product: { units: U[] }): U | undefined {
  return product.units.find((u) => u.prices !== null);
}

export const PACKAGED_UNIT_WEIGHT_KG: Partial<Record<PackagedUnitCode, number>> = catalogue.unit_weights_kg;
