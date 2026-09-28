/**
 * Everything a customer can put in a cart or a quote: the 48 aggregate SKUs
 * (ton / m³ / bag) and the CAT-10/11 packaged goods (bag, drum, tanker…),
 * with the retail list price of each unit where one exists.
 */
import { PRODUCTS } from "./catalogue";
import { PACKAGED_PRODUCTS } from "./packaged";

export type QuotableUnit = { code: string; label: string; retailPrice: number | null };
export type Quotable = { sku: string; slug: string; name: string; categorySlug: string; gradingStandard: string | null; units: QuotableUnit[] };

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
];

const BY_SKU = new Map(QUOTABLE.map((q) => [q.sku, q]));

export function findQuotable(sku: string): Quotable | undefined {
  return BY_SKU.get(sku);
}

/** Whole units only for bags, drums and other packaged units; bulk can be fractional. */
export function isWholeUnit(unit: string) {
  return unit !== "ton" && unit !== "m3";
}
