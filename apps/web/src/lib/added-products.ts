import { ROOFING_CATEGORY_CODES, type RoofingProduct } from "@/data/roofing";
import { rangeCategoryNotes } from "@/data/range";

/**
 * Products staff added in Admin → Catalogue import (docs/catalogue-import.md), as the API's
 * `/catalogue-import/products` gives them. They aren't in the catalogue files, so they're read at request time
 * and shown with the building-supplies product page (the roofing page for roofing categories). Every unit is
 * quote-only until a supplier price is approved — applyLivePrices then prices it like any other product.
 */
export type AddedProductSource = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  brand: string | null;
  gradingStandard: string | null;
  unitSize: string | null;
  description: string | null;
  units: { unit: string; label: string }[];
  addedAt: string;
};

/** The storefront's unit labels, as the catalogue files write them ("Each", "Per m²"). */
const UNIT_LABEL: Record<string, string> = {
  EACH: "Each",
  PACK: "Pack",
  ROLL: "Roll",
  SHEET: "Sheet",
  COIL: "Coil",
  BUNDLE: "Bundle",
  TONNE: "Per tonne",
  KG: "Per kg",
  SQUARE_METRE: "Per m²",
  LINEAR_METRE: "Per metre",
  CUBIC_METRE: "Per m³",
  THOUSAND: "Per 1,000",
  LENGTH_6M: "6 m length",
  LENGTH_12M: "12 m length",
  METRE: "Per metre, cut to length",
  BAG_25KG: "25 kg bag",
  BAG_50KG: "50 kg bag",
  BULK_BAG_1_5T: "1.5-ton bulk bag",
  BULK_TANKER_PER_TON: "Per ton (tanker)",
  DRUM_210L: "210 L drum",
  IBC_TOTE_1000L: "1,000 L tote",
};
const unitLabel = (unit: string) => UNIT_LABEL[unit] ?? unit.replace(/^SHEET_(\d)_(\d)M$/, "$1.$2 m sheet").replace(/^TIMBER_(\d)_(\d)M$/, "$1.$2 m length");

const HANDLING = "Delivered by the supplier's own vehicle, or collected by arrangement. We confirm the delivery charge with your quote.";

export function addedProducts(list: AddedProductSource[] | null | undefined): RoofingProduct[] {
  if (!Array.isArray(list)) return [];
  return list.map((p) => {
    const notes = rangeCategoryNotes(p.categorySlug);
    return {
      line: p.categorySlug in ROOFING_CATEGORY_CODES ? "roofing" : "supplies",
      kind: "roofing",
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      categorySlug: p.categorySlug,
      gradingStandard: p.gradingStandard,
      summary: p.description ?? `${p.name}${p.brand ? ` by ${p.brand}` : ""}.`,
      unitSize: p.unitSize,
      roofProfile: null,
      thicknessMm: null,
      coating: null,
      coverWidthMm: null,
      listPricePerMetre: null,
      section: null,
      timberGrade: null,
      timberTreatment: null,
      timberFinish: null,
      typicalUses: notes?.typicalUses ?? [],
      handlingNotes: notes?.handlingNotes ?? HANDLING,
      units: p.units.map((u) => ({ unit: u.unit as RoofingProduct["units"][number]["unit"], label: unitLabel(u.unit), weightKg: null, pricingStatus: "Quote only", prices: null })),
    };
  });
}
