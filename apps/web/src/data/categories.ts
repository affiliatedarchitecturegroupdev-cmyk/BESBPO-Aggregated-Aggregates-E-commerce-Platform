export type Category = {
  slug: string;
  name: string;
  description: string;
  /** core = the aggregate catalogue (pricing framework workbook); b2b-bulk = packaged cement, binders and chemicals; ready-mix = CAT-12 concrete. */
  catalogueGroup: "core" | "b2b-bulk" | "ready-mix";
};

// The nine core categories of the pricing framework workbook (Category Markup
// Bands sheet). Slugs must match CATEGORY_MAP in
// services/pricing/scripts/import_pricing_framework.py; names here are the
// shorter storefront labels.
export const CATEGORIES: Category[] = [
  { slug: "sub-base-base-course", name: "Sub-Base & Base Course", description: "G1–G10 graded gravels and fill for road and foundation layers.", catalogueGroup: "core" },
  { slug: "crushed-stone", name: "Crushed Stone", description: "SANS 1083 crushed stone from 6.7mm to 53mm, plus crusher dust.", catalogueGroup: "core" },
  { slug: "sand-fine-aggregates", name: "Sand & Fine Aggregates", description: "River, plaster, building, concrete, screeding and silica sand.", catalogueGroup: "core" },
  { slug: "crusher-run-road-building", name: "Crusher Run & Road-Building", description: "COLTO/TRH14 crusher run, rip rap and gabion stone.", catalogueGroup: "core" },
  { slug: "ballast-rail", name: "Ballast & Rail", description: "Ferrocrete ballast, rail ballast and ballast mix.", catalogueGroup: "core" },
  { slug: "drainage-filter", name: "Drainage & Filter", description: "French drain, filter media and subsoil drainage stone.", catalogueGroup: "core" },
  { slug: "decorative-landscaping", name: "Decorative & Landscaping", description: "River pebble, pea gravel and decorative stone, bulk or bagged.", catalogueGroup: "core" },
  { slug: "agricultural-industrial", name: "Agricultural & Industrial", description: "Calcitic, dolomitic and hydrated lime.", catalogueGroup: "core" },
  { slug: "recycled-sustainable", name: "Recycled & Sustainable", description: "Recycled concrete, brick and asphalt planings.", catalogueGroup: "core" },
  // B2B Bulk & Infrastructure expansion — sold per packaged unit (bag, bulk
  // bag, tanker, drum), priced from the B2B pricing workbook, not the
  // ton/m³ framework. See B2B_BULK_CATALOGUE.md.
  { slug: "cement-hydraulic-binders", name: "Cement & Hydraulic Binders", description: "Cement from PPC, AfriSam, Sephaku, Cemza, NPC, Afrimat and more — 32,5N to 52,5R, masonry and road-stabilising — by the bag, bulk bag or tanker.", catalogueGroup: "b2b-bulk" },
  { slug: "mortars-grouts-admixtures", name: "Mortars, Grouts & Admixtures", description: "Structural non-shrink grout and bulk concrete admixtures — accelerators, plasticisers and retarders.", catalogueGroup: "b2b-bulk" },
  // CAT-12 — per m³ by strength grade, full mixer-truck loads (READY_MIX_CATALOGUE.md).
  { slug: "ready-mix-concrete", name: "Ready-Mix Concrete", description: "SANS 878 ready-mixed concrete from 10 to 40 MPa, delivered by mixer truck in full loads — pump hire on request.", catalogueGroup: "ready-mix" },
];

export const CORE_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "core");
export const B2B_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "b2b-bulk");
export const READY_MIX_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "ready-mix");
