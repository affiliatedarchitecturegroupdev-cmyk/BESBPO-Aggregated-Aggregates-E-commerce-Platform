/**
 * The range expansion (docs/pricing/RANGE_EXPANSION.md), slim: its categories and what a cart or quote line
 * needs — safe to import from client components. range-index.json is written by scripts/public-catalogues.py
 * from services/pricing/data/range_catalogue.json; descriptions, uses and handling notes are in
 * range-catalogue.json (see ./range.ts), which only server components load.
 */
import index from "./range-index.json";
import { CUSTOMER_TIERS } from "./catalogue";
import { READY, type TierPrices } from "./packaged";
import { tierPrice } from "@/lib/tier-pricing";

export type RangeCategory = { slug: string; name: string; code: string; department: string; description: string };
type IndexUnit = { unit: string; unit_label: string; list_price_per_unit?: number; markup_percent?: number; pricing_status?: string };
type IndexProduct = { sku: string; slug: string; name: string; category_slug: string; grading_standard: string | null; units: IndexUnit[] };

export const RANGE_CATEGORIES: RangeCategory[] = index.categories;
const PRODUCTS: IndexProduct[] = index.products;

/** Tier prices for a unit — only once it has been benchmarked; every range unit starts quote-only. */
export function rangeUnitPrices(u: IndexUnit): TierPrices | null {
  if (u.pricing_status !== READY || u.list_price_per_unit === undefined) return null;
  const list = u.list_price_per_unit;
  const markup = (u.markup_percent ?? 8) / 100;
  return Object.fromEntries(CUSTOMER_TIERS.map((t) => [t.name, tierPrice(list, markup, "SUPPLIES", t.name)])) as TierPrices;
}

/** The range products as quotable lines (the shape of ./quotable's Quotable). */
export const RANGE_QUOTABLE = PRODUCTS.map((p) => ({
  sku: p.sku,
  slug: p.slug,
  name: p.name,
  categorySlug: p.category_slug,
  gradingStandard: p.grading_standard,
  units: p.units.map((u) => ({ code: u.unit, label: u.unit_label, retailPrice: rangeUnitPrices(u)?.RETAIL ?? null })),
}));
