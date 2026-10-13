/**
 * Storefront departments: the top level of the catalogue, as shoppers think
 * of it (aggregates, cement & concrete, steel, walling, paving, drainage,
 * roofing, timber). Each groups existing categories and points at the
 * department's own landing page. Used by the header department bar,
 * /departments, the homepage department grid and search suggestions.
 */
export type Department = {
  slug: string;
  name: string;
  /** Label in the header department bar. */
  shortName: string;
  /** One line under the name. */
  blurb: string;
  /** The department's landing page. */
  href: string;
  categorySlugs: string[];
};

export const DEPARTMENTS: Department[] = [
  {
    slug: "aggregates",
    shortName: "Aggregates & Sand",
    name: "Aggregates & Sand",
    blurb: "Sub-base, crushed stone, sand, crusher run, ballast, drainage and decorative stone — bulk or bagged.",
    href: "/products?group=core",
    categorySlugs: [
      "sub-base-base-course",
      "crushed-stone",
      "sand-fine-aggregates",
      "crusher-run-road-building",
      "ballast-rail",
      "drainage-filter",
      "decorative-landscaping",
      "agricultural-industrial",
      "recycled-sustainable",
    ],
  },
  {
    slug: "cement-concrete",
    shortName: "Cement & Concrete",
    name: "Cement & Concrete",
    blurb: "Bagged and bulk cement, grout and admixtures, and ready-mix concrete by the mixer truck.",
    href: "/cement",
    categorySlugs: ["cement-hydraulic-binders", "mortars-grouts-admixtures", "ready-mix-concrete"],
  },
  {
    slug: "steel",
    shortName: "Steel",
    name: "Steel & Reinforcing",
    blurb: "Rebar, mesh, brickforce, fixing accessories and structural sections — plus cut & bend.",
    href: "/reinforcing-steel",
    categorySlugs: ["reinforcing-bar", "mesh-brickforce", "steel-fixing-accessories", "structural-steel"],
  },
  {
    slug: "walling",
    shortName: "Bricks & Blocks",
    name: "Bricks, Blocks & Walling",
    blurb: "Clay and cement bricks, concrete blocks, lintels, DPC and air bricks.",
    href: "/bricks-blocks",
    categorySlugs: ["bricks-blocks", "lintels-dpc-wall-accessories"],
  },
  {
    slug: "paving",
    shortName: "Paving",
    name: "Paving & Retaining",
    blurb: "Pavers, slabs, kerbs and edging, retaining blocks and gabions.",
    href: "/paving",
    categorySlugs: ["paving-kerbs-edging", "retaining-erosion-control"],
  },
  {
    slug: "drainage",
    shortName: "Drainage",
    name: "Drainage & Membranes",
    blurb: "uPVC pipe and fittings, precast drainage, DPM, geotextile and geogrid.",
    href: "/drainage",
    categorySlugs: ["pipes-fittings", "precast-drainage", "geosynthetics-membranes"],
  },
  {
    slug: "roofing",
    shortName: "Roofing",
    name: "Roofing",
    blurb: "IBR, corrugated and concealed-fix sheeting, concrete roof tiles, flashings, insulation and gutters.",
    href: "/roofing",
    categorySlugs: ["roof-sheeting", "roof-flashings-fixings", "roof-insulation-rainwater", "concrete-roof-tiles"],
  },
  {
    slug: "timber",
    shortName: "Timber",
    name: "Roof & Structural Timber",
    blurb: "S5 and S7 SA pine, H2 or H3, in 3.0 to 6.6 m lengths — with hangers, clips and fixings.",
    href: "/roofing#roof-timber",
    categorySlugs: ["structural-timber", "timber-connectors"],
  },
];

/** Services sit beside the material departments in navigation, not in the product index. */
export const SERVICE_LINKS = [
  { href: "/plant-hire", label: "Plant Hire" },
  { href: "/services", label: "Services" },
  { href: "/design", label: "Design" },
  { href: "/job-packs", label: "Job Packs" },
];

const BY_CATEGORY = new Map(DEPARTMENTS.flatMap((d) => d.categorySlugs.map((c) => [c, d] as const)));

export function departmentOf(categorySlug: string): Department | undefined {
  return BY_CATEGORY.get(categorySlug);
}
