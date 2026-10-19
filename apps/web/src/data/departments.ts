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
    blurb: "Rebar, mesh, brickforce and fixing accessories; angles, channels, I-beams, tube, plate and sheet — plus cut & bend.",
    href: "/reinforcing-steel",
    categorySlugs: ["reinforcing-bar", "mesh-brickforce", "steel-fixing-accessories", "structural-steel"],
  },
  {
    slug: "walling",
    shortName: "Bricks & Blocks",
    name: "Bricks, Blocks & Walling",
    blurb: "Clay face, NFX and stock bricks, cement bricks, hollow, solid and U-blocks, lintels from 0.9 to 6.6 m, DPC and air bricks.",
    href: "/bricks-blocks",
    categorySlugs: ["bricks-blocks", "lintels-dpc-wall-accessories"],
  },
  {
    slug: "paving",
    shortName: "Paving",
    name: "Paving & Retaining",
    blurb: "Concrete and clay pavers, slabs, cobbles, kerbs and edging, Terraforce and gravity retaining blocks, gabions and Reno mattresses.",
    href: "/paving",
    categorySlugs: ["paving-kerbs-edging", "retaining-erosion-control"],
  },
  {
    slug: "drainage",
    shortName: "Drainage",
    name: "Drainage & Membranes",
    blurb: "Sewer pipe 110–250 mm and fittings, concrete pipes to 1,200 mm, manholes and channels, DPM, geotextile and geogrid.",
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
  // Building supplies (CAT-32..42, BUILDING_SUPPLIES_CATALOGUE.md) — approved by the owner, 17 Oct 2026.
  {
    slug: "doors-windows",
    shortName: "Doors & Windows",
    name: "Doors, Windows & Frames",
    blurb: "Interior, exterior, stable and security doors, garage doors, steel frames, the full steel and wooden window schedules, aluminium windows and sliding doors.",
    href: "/doors-windows",
    categorySlugs: ["doors-frames", "windows-frames"],
  },
  {
    slug: "fencing-security",
    shortName: "Fencing",
    name: "Fencing & Security",
    blurb: "Diamond, welded and clear-view mesh, palisade, razor and electric fencing, Y-standards, gates, gate motors and burglar bars.",
    href: "/fencing-security",
    categorySlugs: ["fencing-wire-posts", "gates-security"],
  },
  {
    slug: "water-plumbing",
    shortName: "Water & Plumbing",
    name: "Water Storage & Plumbing",
    blurb: "Water tanks from 250 to 10,000 L, septic tanks, electric and solar geysers, Polycop, copper, HDPE and uPVC pressure pipe, valves and fittings.",
    href: "/water-plumbing",
    categorySlugs: ["water-tanks-geysers", "water-supply-soil-pipe"],
  },
  {
    slug: "ceilings-drywall",
    shortName: "Ceilings",
    name: "Ceilings, Drywall & Insulation",
    blurb: "Gypsum, fibre-cement and PVC ceiling boards, drywall partition board, cornices, skimming plaster — with ceiling insulation from roofing.",
    href: "/ceilings-drywall",
    categorySlugs: ["ceilings-drywall"],
  },
  {
    slug: "tools-ppe",
    shortName: "Tools & PPE",
    name: "Site Tools, PPE & Consumables",
    blurb: "Trowels, levels, hammers, shovels, wheelbarrows and grinders — hard hats, boots, gloves, harnesses, first aid and site signage.",
    href: "/tools-ppe",
    categorySlugs: ["site-tools", "ppe-site-safety"],
  },
  {
    slug: "paint-waterproofing",
    shortName: "Paint & Waterproofing",
    name: "Waterproofing, Sealants & Paint",
    blurb: "Sealants, torch-on and liquid waterproofing, membranes and primers — interior, exterior, roof, floor and metal paint.",
    href: "/paint-waterproofing",
    categorySlugs: ["waterproofing-sealants", "paint-coatings"],
  },
  // Services & fit-out (CAT-43..56, docs/pricing/FITOUT_CATALOGUE.md).
  {
    slug: "electrical",
    shortName: "Electrical",
    name: "Electrical & Solar",
    blurb: "Surfix and house wire, conduit, distribution boards and breakers, switches, sockets and LED lighting, and solar panels, inverters and batteries.",
    href: "/electrical",
    categorySlugs: ["electrical-cable-conduit", "electrical-distribution", "switches-sockets-lighting", "solar-backup-power"],
  },
  {
    slug: "tiles-flooring",
    shortName: "Tiles & Flooring",
    name: "Tiles & Flooring",
    blurb: "Ceramic and porcelain floor and wall tiles, laminate and vinyl flooring, skirting, tile trims and levelling — with adhesives and grouts from cement.",
    href: "/tiles-flooring",
    categorySlugs: ["floor-wall-tiles", "flooring-skirting", "tiling-accessories"],
  },
  {
    slug: "bathroom-kitchen",
    shortName: "Bathroom & Kitchen",
    name: "Bathroom & Kitchen",
    blurb: "Toilets, basins, baths and showers, taps and mixers, valves and connectors, kitchen sinks, traps and wastes.",
    href: "/bathroom-kitchen",
    categorySlugs: ["sanitaryware", "taps-mixers-valves", "kitchen-sinks-waste"],
  },
  {
    slug: "hardware-fasteners",
    shortName: "Hardware",
    name: "Hardware & Fasteners",
    blurb: "Nails, screws, wall plugs, anchors, bolts and threaded rod, and locks, hinges, handles, padlocks and door hardware.",
    href: "/hardware-fasteners",
    categorySlugs: ["fasteners-fixings", "locks-ironmongery"],
  },
  {
    slug: "boards-formwork",
    shortName: "Boards & Formwork",
    name: "Boards & Formwork",
    blurb: "Shutterply and shutterboard, plywood, OSB, chipboard, MDF and Masonite, and steel props, formwork ties, clamps and scaffolding.",
    href: "/boards-formwork",
    categorySlugs: ["boards-sheets", "formwork-scaffolding"],
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
