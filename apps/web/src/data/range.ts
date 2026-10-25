/**
 * The range expansion (docs/pricing/RANGE_EXPANSION.md, ROADMAP Phase 2): CAT-57 onwards — fifteen new
 * departments (garden, outdoor living, formwork and access, roads and civil, precast, construction chemicals,
 * insulation and fire, glass and aluminium, kitchens, HVAC, site establishment, power tools, prefab, farm,
 * mining and industrial) and deeper timber, plumbing, electrical, flooring, security, hardware and paint.
 *
 * The products are in the building-supplies line (the merchant's own transport, SUPPLIES pricing family) and
 * share its product page. Each category carries its typical uses and handling notes once; they're filled in
 * per product here. Every unit is quote-only until it's benchmarked under PRICING_POLICY.md.
 *
 * range-catalogue.json is the public copy of services/pricing/data/range_catalogue.json. It's large: import
 * this module from server components only — client components use ./range-index.
 */
import catalogue from "./range-catalogue.json";
import { flatbedProducts, type RoofingProduct } from "./roofing";

type RangeSourceCategory = { slug: string; name: string; code: string; department: string; description: string; typical_uses: string[]; handling_notes: string };
type RangeSourceProduct = {
  sku: string;
  slug: string;
  name: string;
  category_slug: string;
  grading_standard: string | null;
  description: string;
  unit_size: string | null;
  units: { unit: string; unit_label: string; weight_kg: number | null; pricing_status: string; list_price_per_unit: number | null; markup_percent: number }[];
};

const CATEGORIES: RangeSourceCategory[] = catalogue.categories;
const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** A range category's typical uses and handling notes — for products staff add to it (lib/added-products.ts). */
export function rangeCategoryNotes(slug: string): { typicalUses: string[]; handlingNotes: string } | null {
  const category = BY_SLUG.get(slug);
  return category ? { typicalUses: category.typical_uses, handlingNotes: category.handling_notes } : null;
}

export const RANGE_CATEGORY_CODES: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.code]));

export const RANGE_PRODUCTS: RoofingProduct[] = flatbedProducts(
  {
    products: (catalogue.products as RangeSourceProduct[]).map((p) => {
      const category = BY_SLUG.get(p.category_slug)!;
      return {
        ...p,
        roof_profile: null,
        thickness_mm: null,
        coating: null,
        cover_width_mm: null,
        list_price_per_metre: null,
        section: null,
        timber_grade: null,
        timber_treatment: null,
        timber_finish: null,
        typical_uses: category.typical_uses,
        handling_notes: category.handling_notes,
      };
    }),
  },
  "supplies",
);
