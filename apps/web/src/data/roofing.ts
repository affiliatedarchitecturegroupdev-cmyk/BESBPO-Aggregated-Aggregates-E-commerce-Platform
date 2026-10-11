/**
 * The roofing line (ROOFING_CATALOGUE.md): CAT-26 Roof Sheeting, CAT-27
 * Flashings, Ridges & Fixings and CAT-28 Insulation, Underlay & Rainwater.
 * Concrete roof tiles (CAT-29) are in the masonry line but sold alongside.
 *
 * Roof sheets come in six standard lengths (3.0 to 6.6 m), one unit each;
 * any length from 1 m to 14 m is cut to length on a quote. Flashings and
 * fittings are per item, screws per box, insulation and underlay per roll.
 *
 * roofing-catalogue.json is an exact copy of
 * services/pricing/data/roofing_catalogue.json — a pricing-service test fails
 * if they drift. A unit only shows a price when it is "Ready — benchmarked"
 * (at least two SA retailers' regular prices); every other unit goes to a
 * quote with the supplier (AGENTIC_RULES.md rules 1 and 10).
 */
import catalogue from "./roofing-catalogue.json";
import { CUSTOMER_TIERS } from "./catalogue";
import { READY, type TierPrices } from "./packaged";
import { tierPrice } from "@/lib/tier-pricing";

export type SheetLengthUnit = "SHEET_3_0M" | "SHEET_3_6M" | "SHEET_4_2M" | "SHEET_4_8M" | "SHEET_6_0M" | "SHEET_6_6M";
export type RoofingUnitCode = SheetLengthUnit | "METRE" | "EACH" | "PACK" | "ROLL";

/** The standard sheet lengths, in metres, by unit. */
export const SHEET_LENGTHS: Record<SheetLengthUnit, number> = {
  SHEET_3_0M: 3.0,
  SHEET_3_6M: 3.6,
  SHEET_4_2M: 4.2,
  SHEET_4_8M: 4.8,
  SHEET_6_0M: 6.0,
  SHEET_6_6M: 6.6,
};
export const CUT_TO_LENGTH = catalogue.cut_to_length;

export type RoofingUnit = {
  unit: RoofingUnitCode;
  label: string;
  weightKg: number | null;
  pricingStatus: string;
  sourceNote: string;
  prices: TierPrices | null;
};

export type RoofingProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  gradingStandard: string | null;
  summary: string;
  unitSize: string | null;
  /** Roof sheets only. */
  roofProfile: string | null;
  thicknessMm: number | null;
  coating: string | null;
  coverWidthMm: number | null;
  /** Retail list price per metre where the sheet is benchmarked — the rate for cut-to-length estimates. */
  listPricePerMetre: number | null;
  typicalUses: string[];
  handlingNotes: string;
  units: RoofingUnit[];
  kind: "roofing";
};

export const ROOFING_CATEGORY_CODES: Record<string, string> = Object.fromEntries(catalogue.categories.map((c) => [c.slug, c.code]));

export const ROOFING_PRODUCTS: RoofingProduct[] = catalogue.products.map((p) => ({
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  categorySlug: p.category_slug,
  gradingStandard: p.grading_standard,
  summary: p.description,
  unitSize: p.unit_size,
  roofProfile: p.roof_profile,
  thicknessMm: p.thickness_mm,
  coating: p.coating,
  coverWidthMm: p.cover_width_mm,
  listPricePerMetre: p.list_price_per_metre,
  typicalUses: p.typical_uses,
  handlingNotes: p.handling_notes,
  kind: "roofing",
  units: p.units.map((u) => ({
    unit: u.unit as RoofingUnitCode,
    label: u.unit_label,
    weightKg: u.weight_kg,
    pricingStatus: u.pricing_status,
    sourceNote: u.source_note,
    prices:
      u.pricing_status === READY && u.list_price_per_unit !== null
        ? (Object.fromEntries(CUSTOMER_TIERS.map((t) => [t.name, tierPrice(u.list_price_per_unit as number, u.markup_percent / 100, "ROOFING", t.name)])) as TierPrices)
        : null,
  })),
}));

export function findRoofingProduct(slug: string) {
  return ROOFING_PRODUCTS.find((p) => p.slug === slug);
}

export const ROOF_SHEETS = ROOFING_PRODUCTS.filter((p) => p.categorySlug === "roof-sheeting");
export const isSheetUnit = (unit: string): unit is SheetLengthUnit => unit in SHEET_LENGTHS;

/** Overlap allowed where two sheets meet end to end on a long roof slope. */
export const END_LAP_M = 0.2;
/** Overhang into the gutter at the eaves. */
export const EAVES_OVERHANG_M = 0.05;

/**
 * Sheets for one roof slope: the slope length (eaves to ridge, plus the
 * eaves overhang) is covered by one sheet where it fits the 14 m maximum,
 * otherwise by sheets lapped end to end; the slope width is covered by
 * sheets side by side at the profile's cover width, rounded up.
 *
 * Returns the cut length each sheet needs and how many, and — when a
 * standard length covers it within 10 cm — that standard length, so the
 * order can go to the cart instead of a cut-to-length quote.
 */
export function sheetTakeOff(slopeLengthM: number, slopeWidthM: number, coverWidthMm: number) {
  const run = Math.max(0, slopeLengthM) + EAVES_OVERHANG_M;
  const across = Math.max(1, Math.ceil((Math.max(0, slopeWidthM) * 1000) / coverWidthMm));
  // Lengthwise: as few pieces as possible, none longer than the cut-to-length maximum.
  const pieces = Math.max(1, Math.ceil((run - END_LAP_M) / (CUT_TO_LENGTH.max_m - END_LAP_M)));
  const pieceLength = Math.max(CUT_TO_LENGTH.min_m, Math.ceil(((run + (pieces - 1) * END_LAP_M) / pieces) * 10) / 10);
  const standard = (Object.entries(SHEET_LENGTHS) as [SheetLengthUnit, number][]).find(([, l]) => l >= pieceLength && l - pieceLength <= 0.1);
  return {
    sheets: across * pieces,
    across,
    pieces,
    cutLengthM: pieceLength,
    totalMetres: Math.round(across * pieces * pieceLength * 10) / 10,
    standardUnit: standard ? standard[0] : null,
  };
}
