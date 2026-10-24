/**
 * The building-supplies catalogue on its own (CAT-32..56), light enough for client components. ./supplies
 * adds the range expansion (CAT-57 onwards) for server components.
 *
 * Building supplies (BUILDING_SUPPLIES_CATALOGUE.md): CAT-32..42 across six
 * departments approved by the owner on 17 Oct 2026 — doors, windows & frames;
 * fencing & security; water storage & plumbing; ceilings, drywall &
 * insulation; site tools, PPE & consumables; waterproofing, sealants & paint.
 *
 * The products share the roofing line's shape (per item, per board, per roll
 * or per pack) and come on the merchant's own vehicle; they are priced in
 * their own SUPPLIES family. supplies-catalogue.json is the public copy of
 * services/pricing/data/supplies_catalogue.json (internal research removed).
 * A unit shows a price only when two SA retailers list the same product at a
 * regular price; everything else is quoted with the supplier.
 */
import catalogue from "./supplies-catalogue.json";
import { flatbedProducts, type RoofingProduct } from "./roofing";

export const SUPPLIES_LINE_CATEGORY_CODES: Record<string, string> = Object.fromEntries(catalogue.categories.map((c) => [c.slug, c.code]));

export const SUPPLIES_LINE_PRODUCTS: RoofingProduct[] = flatbedProducts(catalogue, "supplies");
