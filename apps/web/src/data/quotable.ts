/**
 * Everything a customer can put in a cart or a quote: the 48 aggregate SKUs
 * (ton / m³ / bag), the CAT-10/11 packaged goods (bag, drum, tanker…) and
 * CAT-12 ready-mix (per m³), CAT-15..18 steel (length, tonne, sheet…) and
 * CAT-19..25 and 29 masonry (per 1,000 bricks, per item, per roll), CAT-26..28
 * roofing (sheets in standard lengths, per item, per box, per roll), building
 * supplies and the range expansion (per item, m², metre, m³, kg or bundle),
 * with the retail list price of each unit where one exists.
 */
import { PRODUCTS } from "./catalogue";
import { PACKAGED_PRODUCTS } from "./packaged";
import { READY_MIX_PRODUCTS } from "./ready-mix";
import { MASONRY_PRODUCTS } from "./masonry";
import { ROOFING_PRODUCTS } from "./roofing";
import { RANGE_QUOTABLE } from "./range-index";
import { SUPPLIES_LINE_PRODUCTS } from "./supplies-line";
import { STEEL_PRODUCTS } from "./steel";

export type QuotableUnit = { code: string; label: string; retailPrice: number | null };
export type Quotable = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  gradingStandard: string | null;
  units: QuotableUnit[];
  /** Ready-mix: the smallest full mixer-truck load. */
  minimumQuantity?: number;
};

const BULK_LABELS: Record<string, string> = { ton: "ton", m3: "m³", bag: "bag" };

export const QUOTABLE: Quotable[] = [
  ...PRODUCTS.map((p) => ({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    gradingStandard: p.gradingStandard,
    units: p.units.map((u) => ({
      code: u,
      label: u === "bag" && p.bagWeightKg ? `${p.bagWeightKg}kg bag` : BULK_LABELS[u],
      retailPrice: p.prices.RETAIL[u] ?? null,
    })),
  })),
  ...PACKAGED_PRODUCTS.map((p) => ({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    gradingStandard: p.gradingStandard,
    units: p.units.map((u) => ({ code: u.unit, label: u.label, retailPrice: u.prices?.RETAIL ?? null })),
  })),
  ...READY_MIX_PRODUCTS.map((p) => ({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    gradingStandard: p.gradingStandard,
    minimumQuantity: p.minimumLoadM3,
    units: p.units.map((u) => ({ code: u.unit, label: u.label, retailPrice: u.prices?.RETAIL ?? null })),
  })),
  ...STEEL_PRODUCTS.map((p) => ({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    gradingStandard: p.gradingStandard,
    units: p.units.map((u) => ({ code: u.unit, label: u.label, retailPrice: u.prices?.RETAIL ?? null })),
  })),
  ...MASONRY_PRODUCTS.map((p) => ({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    gradingStandard: p.gradingStandard,
    units: p.units.map((u) => ({ code: u.unit, label: u.label, retailPrice: u.prices?.RETAIL ?? null })),
  })),
  ...[...ROOFING_PRODUCTS, ...SUPPLIES_LINE_PRODUCTS].map((p) => ({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    gradingStandard: p.gradingStandard,
    units: p.units.map((u) => ({ code: u.unit, label: u.label, retailPrice: u.prices?.RETAIL ?? null })),
  })),
  // The range expansion (CAT-57 onwards) from its slim index, so client components don't load its descriptions.
  ...RANGE_QUOTABLE,
];

const BY_SKU = new Map(QUOTABLE.map((q) => [q.sku, q]));

// Products staff added in Admin → Catalogue import (docs/catalogue-import.md) aren't in the files above: the root
// layout hands them over at runtime (AddedProductsProvider), before any page renders.
let added: { key: string; list: Quotable[]; bySku: Map<string, Quotable>; all: Quotable[] } = { key: "", list: [], bySku: new Map(), all: QUOTABLE };

export function setAddedQuotable(list: Quotable[]) {
  const key = list.map((q) => `${q.sku}:${q.units.map((u) => `${u.code}=${u.retailPrice}`).join("+")}`).join(",");
  if (key !== added.key) added = { key, list, bySku: new Map(list.map((q) => [q.sku, q])), all: list.length ? [...QUOTABLE, ...list] : QUOTABLE };
}

/** Everything that can go in a cart or a quote, including products staff added. */
export function allQuotable(): Quotable[] {
  return added.all;
}

export function findQuotable(sku: string): Quotable | undefined {
  return BY_SKU.get(sku) ?? added.bySku.get(sku);
}

/** Whole units only for bags, drums and other packaged units; bulk can be fractional. */
export function isWholeUnit(unit: string) {
  return unit !== "ton" && unit !== "m3";
}
