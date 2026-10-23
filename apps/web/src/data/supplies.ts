/**
 * Everything in the building-supplies line, for server components: the building supplies (CAT-32..56,
 * ./supplies-line) and the range expansion (CAT-57 onwards, ./range, docs/pricing/RANGE_EXPANSION.md). They
 * share the roofing product shape, the merchant's own transport and the SUPPLIES pricing family.
 *
 * The range is large — client components import ./supplies-line and ./range-index instead.
 */
import { RANGE_CATEGORY_CODES, RANGE_PRODUCTS } from "./range";
import type { RoofingProduct } from "./roofing";
import { SUPPLIES_LINE_CATEGORY_CODES, SUPPLIES_LINE_PRODUCTS } from "./supplies-line";

export const SUPPLIES_CATEGORY_CODES: Record<string, string> = { ...SUPPLIES_LINE_CATEGORY_CODES, ...RANGE_CATEGORY_CODES };

export const SUPPLIES_PRODUCTS: RoofingProduct[] = [...SUPPLIES_LINE_PRODUCTS, ...RANGE_PRODUCTS];

export function findSuppliesProduct(slug: string) {
  return SUPPLIES_PRODUCTS.find((p) => p.slug === slug);
}
