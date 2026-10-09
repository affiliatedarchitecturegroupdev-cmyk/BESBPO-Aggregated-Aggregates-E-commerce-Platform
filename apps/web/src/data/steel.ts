/**
 * Reinforcing & structural steel, CAT-15 to CAT-18 (STEEL_CATALOGUE.md):
 * rebar, mesh & brickforce, fixing accessories and structural sections,
 * sold per stock length, tonne, sheet, roll, coil, pack or item.
 *
 * steel-catalogue.json is an exact copy of
 * services/pricing/data/steel_catalogue.json — a pricing-service test fails
 * if they drift. A unit only shows a price when it is "Ready — benchmarked"
 * (at least two SA retailers' regular prices); every other unit goes to a
 * quote with the merchant (AGENTIC_RULES.md rules 1 and 10).
 */
import catalogue from "./steel-catalogue.json";
import { CUSTOMER_TIERS } from "./catalogue";
import { READY, type TierPrices } from "./packaged";
import { tierPrice } from "@/lib/tier-pricing";

export type SteelUnitCode = "LENGTH_6M" | "LENGTH_12M" | "TONNE" | "SHEET" | "ROLL" | "COIL" | "PACK" | "EACH";
export const STEEL_UNIT_CODES: SteelUnitCode[] = ["LENGTH_6M", "LENGTH_12M", "TONNE", "SHEET", "ROLL", "COIL", "PACK", "EACH"];

export type SteelUnit = {
  unit: SteelUnitCode;
  label: string;
  /** Mass of one unit in kg, where known (bar lengths, coils, a tonne). */
  weightKg: number | null;
  pricingStatus: string;
  sourceNote: string;
  prices: TierPrices | null;
};

export type SteelProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  gradingStandard: string | null;
  summary: string;
  steelFamily: string;
  steelGrade: string | null;
  diameterMm: number | null;
  massKgPerM: number | null;
  sectionSize: string | null;
  typicalUses: string[];
  handlingNotes: string;
  units: SteelUnit[];
  kind: "steel";
};

export const STEEL_CATEGORY_CODES: Record<string, string> = Object.fromEntries(catalogue.categories.map((c) => [c.slug, c.code]));

/** SANS 920 nominal mass per metre, by bar diameter (mm). */
export const BAR_MASS_KG_PER_M: Record<number, number> = Object.fromEntries(Object.entries(catalogue.mass_kg_per_m).map(([d, m]) => [Number(d), m]));

export const STEEL_PRODUCTS: SteelProduct[] = catalogue.products.map((p) => ({
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  categorySlug: p.category_slug,
  gradingStandard: p.grading_standard,
  summary: p.description,
  steelFamily: p.steel_family,
  steelGrade: p.steel_grade,
  diameterMm: p.diameter_mm,
  massKgPerM: p.mass_kg_per_m,
  sectionSize: p.section_size,
  typicalUses: p.typical_uses,
  handlingNotes: p.handling_notes,
  kind: "steel",
  units: p.units.map((u) => ({
    unit: u.unit as SteelUnitCode,
    label: u.unit_label,
    weightKg: u.weight_kg,
    pricingStatus: u.pricing_status,
    sourceNote: u.source_note,
    prices:
      u.pricing_status === READY && u.list_price_per_unit !== null
        ? (Object.fromEntries(CUSTOMER_TIERS.map((t) => [t.name, tierPrice(u.list_price_per_unit as number, u.markup_percent / 100, "STEEL", t.name)])) as TierPrices)
        : null,
  })),
}));

export function findSteelProduct(slug: string) {
  return STEEL_PRODUCTS.find((p) => p.slug === slug);
}

/** Y-bars by diameter, for the mass calculator. */
export const Y_BARS = STEEL_PRODUCTS.filter((p) => p.sku.startsWith("AA-STL-Y") && p.diameterMm !== null);

/**
 * Bar quantities from a total run of bar: mass from the SANS 920 nominal
 * kg/m, and stock lengths with no allowance for laps or offcuts (the
 * customer adds those — the engineer's schedule governs).
 */
export function barTakeOff(diameterMm: number, metres: number, stockLengthM = 6) {
  const kgPerM = BAR_MASS_KG_PER_M[diameterMm] ?? 0;
  const kg = Math.round(metres * kgPerM * 100) / 100;
  return { kgPerM, kg, tonnes: Math.round(kg) / 1000, lengths: metres > 0 ? Math.ceil(metres / stockLengthM) : 0 };
}
