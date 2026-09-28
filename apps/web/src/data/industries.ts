/**
 * The six approved B2B target sectors (B2B Bulk & Infrastructure planning,
 * approved September 2026). They replace the earlier generic sector cards
 * and link through to category-filtered listings. Category slugs are the
 * storefront's own (data/categories.ts).
 */
export type Industry = {
  slug: string;
  name: string;
  description: string;
  relevantCategorySlugs: string[];
};

export const INDUSTRIES: Industry[] = [
  {
    slug: "ready-mix-precast",
    name: "Ready-Mix & Precast Concrete Manufacturers",
    description: "Constant daily intake of stone aggregates, washed river sand, plaster sand, and bulk cement.",
    relevantCategorySlugs: ["crushed-stone", "sand-fine-aggregates", "cement-hydraulic-binders", "mortars-grouts-admixtures"],
  },
  {
    slug: "asphalt-roadworks",
    name: "Asphalt Plants, Road Surfacing & Paving Specialists",
    description: "Crusher dust, G1–G5 crushed stone base course, aggregate chips, and road-capping binders.",
    relevantCategorySlugs: ["sub-base-base-course", "crushed-stone", "crusher-run-road-building", "cement-hydraulic-binders"],
  },
  {
    slug: "industrial-earthworks",
    name: "Industrial, Logistics Precinct & Earthworks Developers",
    description:
      "High-volume sub-base materials, rock for site stabilisation, drainage stone, and bulk cement for soil-cement stabilisation.",
    relevantCategorySlugs: ["sub-base-base-course", "crusher-run-road-building", "drainage-filter", "cement-hydraulic-binders"],
  },
  {
    slug: "mining-environmental",
    name: "Mining Infrastructure, Tailings & Environmental Remediation",
    description: "Rip rap, gabion stone, filter media, bulk lime, and road-capping gravel.",
    relevantCategorySlugs: ["crusher-run-road-building", "drainage-filter", "agricultural-industrial", "sub-base-base-course"],
  },
  {
    slug: "municipal-water",
    name: "Municipalities, SANRAL Sub-Contractors & Water Infrastructure",
    description: "Bedding and filling sand, filter stone, G1 sub-base, and bulk supply for emergency storm repair.",
    relevantCategorySlugs: ["sand-fine-aggregates", "drainage-filter", "sub-base-base-course"],
  },
  {
    slug: "agricultural-landscaping",
    name: "Agricultural, Commercial Farming & Landscaping Developers",
    description: "Agricultural lime, drainage stone, farm-road sub-base gravel, and decorative stone and pebble.",
    relevantCategorySlugs: ["agricultural-industrial", "drainage-filter", "sub-base-base-course", "decorative-landscaping"],
  },
];
