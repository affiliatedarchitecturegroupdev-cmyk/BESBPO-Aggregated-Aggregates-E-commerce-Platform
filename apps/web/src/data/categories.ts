export type Category = {
  slug: string;
  name: string;
  description: string;
};

// The nine categories of the pricing framework workbook (Category Markup
// Bands sheet). Slugs must match CATEGORY_MAP in
// services/pricing/scripts/import_pricing_framework.py; names here are the
// shorter storefront labels.
export const CATEGORIES: Category[] = [
  { slug: "sub-base-base-course", name: "Sub-Base & Base Course", description: "G1–G10 graded gravels and fill for road and foundation layers." },
  { slug: "crushed-stone", name: "Crushed Stone", description: "SANS 1083 crushed stone from 6.7mm to 53mm, plus crusher dust." },
  { slug: "sand-fine-aggregates", name: "Sand & Fine Aggregates", description: "River, plaster, building, concrete, screeding and silica sand." },
  { slug: "crusher-run-road-building", name: "Crusher Run & Road-Building", description: "COLTO/TRH14 crusher run, rip rap and gabion stone." },
  { slug: "ballast-rail", name: "Ballast & Rail", description: "Ferrocrete ballast, rail ballast and ballast mix." },
  { slug: "drainage-filter", name: "Drainage & Filter", description: "French drain, filter media and subsoil drainage stone." },
  { slug: "decorative-landscaping", name: "Decorative & Landscaping", description: "River pebble, pea gravel and decorative stone, bulk or bagged." },
  { slug: "agricultural-industrial", name: "Agricultural & Industrial", description: "Calcitic, dolomitic and hydrated lime." },
  { slug: "recycled-sustainable", name: "Recycled & Sustainable", description: "Recycled concrete, brick and asphalt planings." },
];
