import { RANGE_CATEGORIES } from "./range-index";

/**
 * Storefront departments: the top level of the catalogue, as shoppers think
 * of it — 35 of them since the range expansion (docs/pricing/RANGE_EXPANSION.md).
 * Each groups categories and points at the department's own landing page.
 * Used by the header, /departments, the homepage department grid and search
 * suggestions. The header bar shows the departments marked inBar; the menu
 * and /departments list them all.
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
  /** Shown in the header's department bar (the rest are a click away under All departments). */
  inBar?: boolean;
};

/** The range-expansion categories (CAT-57 onwards) in a department, from the catalogue's department field. */
const range = (department: string) => RANGE_CATEGORIES.filter((c) => c.department === department).map((c) => c.slug);

export const DEPARTMENTS: Department[] = [
  {
    slug: "aggregates",
    inBar: true,
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
    inBar: true,
    shortName: "Cement & Concrete",
    name: "Cement & Concrete",
    blurb: "Bagged and bulk cement, grout and admixtures, and ready-mix concrete by the mixer truck.",
    href: "/cement",
    categorySlugs: ["cement-hydraulic-binders", "mortars-grouts-admixtures", "ready-mix-concrete"],
  },
  {
    slug: "steel",
    inBar: true,
    shortName: "Steel",
    name: "Steel & Reinforcing",
    blurb: "Rebar, mesh, brickforce and fixing accessories; angles, channels, I-beams, tube, plate and sheet — plus cut & bend.",
    href: "/reinforcing-steel",
    categorySlugs: ["reinforcing-bar", "mesh-brickforce", "steel-fixing-accessories", "structural-steel"],
  },
  {
    slug: "walling",
    inBar: true,
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
    inBar: true,
    shortName: "Roofing",
    name: "Roofing",
    blurb: "IBR, corrugated and concealed-fix sheeting, concrete roof tiles, flashings, insulation and gutters.",
    href: "/roofing",
    categorySlugs: ["roof-sheeting", "roof-flashings-fixings", "roof-insulation-rainwater", "concrete-roof-tiles"],
  },
  {
    slug: "timber",
    inBar: true,
    shortName: "Timber & Poles",
    name: "Timber, Poles & Decking",
    blurb: "S5 and S7 SA pine, treated poles and droppers, glulam and LVL, hardwoods, decking and cladding, mining timber and carport, pergola and lapa kits.",
    href: "/timber",
    categorySlugs: ["structural-timber", "timber-connectors", ...range("timber")],
  },
  {
    slug: "formwork-access",
    inBar: true,
    shortName: "Formwork",
    name: "Formwork, Scaffolding & Access",
    blurb: "Props, shoring and formwork beams, tie rods, cones and column formers, scaffolding, ladders, mobile towers and trestles — for sale or hire.",
    href: "/formwork-access",
    categorySlugs: ["formwork-scaffolding", ...range("formwork-access")],
  },
  {
    slug: "precast-concrete",
    shortName: "Precast",
    name: "Precast Concrete",
    blurb: "Hollow-core and rib-and-block slabs, precast stairs and beams, New Jersey barriers, bollards, draw boxes, panel walls and septic and conservancy tanks.",
    href: "/precast-concrete",
    categorySlugs: range("precast-concrete"),
  },
  {
    slug: "roads-civil",
    inBar: true,
    shortName: "Roads & Civil",
    name: "Roads, Civil & Traffic",
    blurb: "Cold-mix and hot-mix asphalt, bitumen emulsions, road-marking paint and studs, cones, barriers and road-works signs, survey and setting-out, and erosion control.",
    href: "/roads-civil",
    categorySlugs: range("roads-civil"),
  },
  {
    slug: "construction-chemicals",
    shortName: "Chemicals",
    name: "Construction Chemicals",
    blurb: "Curing compounds, bonding agents, repair mortars and screeds, floor hardeners, joint sealants and waterstops, chemical anchors and epoxy grouts, and tanking systems.",
    href: "/construction-chemicals",
    categorySlugs: range("construction-chemicals"),
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
    slug: "glass-aluminium",
    shortName: "Glass & Aluminium",
    name: "Glass, Glazing & Aluminium",
    blurb: "Float, laminated and toughened glass cut to size, mirrors, shower enclosures, glass balustrades, aluminium sections and made-to-measure shopfronts and windows.",
    href: "/glass-aluminium",
    categorySlugs: range("glass-aluminium"),
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
    slug: "security-access",
    shortName: "CCTV & Alarms",
    name: "Security, CCTV & Access Control",
    blurb: "IP and analogue CCTV cameras and recorders, intercoms, keypads, readers and maglocks, alarm panels and detectors, and electric-fence energisers and parts.",
    href: "/security-access",
    categorySlugs: range("security-access"),
  },
  {
    slug: "water-plumbing",
    inBar: true,
    shortName: "Water & Plumbing",
    name: "Water Storage & Plumbing",
    blurb: "Water tanks and geysers, heat pumps, borehole and booster pumps, filtration, Polycop, copper, HDPE, PEX and uPVC pipe, valves, meters and fittings.",
    href: "/water-plumbing",
    categorySlugs: ["water-tanks-geysers", "water-supply-soil-pipe", ...range("water-plumbing")],
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
    slug: "insulation-fire-acoustic",
    shortName: "Insulation & Fire",
    name: "Insulation, Fire & Acoustic",
    blurb: "XPS, EPS and PIR boards, insulation per m², pipe lagging and geyser blankets, extinguishers, hose reels, fire signs and detectors, fire stopping and acoustic ceilings.",
    href: "/insulation-fire-acoustic",
    categorySlugs: range("insulation-fire-acoustic"),
  },
  {
    slug: "tools-ppe",
    inBar: true,
    shortName: "Tools & PPE",
    name: "Site Tools, PPE & Consumables",
    blurb: "Trowels, levels, hammers, shovels, wheelbarrows and grinders — hard hats, boots, gloves, harnesses, first aid and site signage.",
    href: "/tools-ppe",
    categorySlugs: ["site-tools", "ppe-site-safety"],
  },
  {
    slug: "power-tools-equipment",
    shortName: "Power Tools",
    name: "Power Tools & Site Equipment",
    blurb: "Drills, breakers, grinders and saws, cordless kits, drill bits, discs and diamond blades, mixers, compactors, vibrators and power floats, and levels and lasers.",
    href: "/power-tools-equipment",
    categorySlugs: range("power-tools-equipment"),
  },
  {
    slug: "site-establishment",
    shortName: "Site Establishment",
    name: "Site Establishment & Temporary Works",
    blurb: "Site offices and containers, ablutions and chemical toilets, temporary fencing and hoarding, site signs, site power and lighting, and site consumables.",
    href: "/site-establishment",
    categorySlugs: range("site-establishment"),
  },
  {
    slug: "paint-waterproofing",
    shortName: "Paint & Waterproofing",
    name: "Waterproofing, Sealants & Paint",
    blurb: "Sealants, torch-on and liquid waterproofing, membranes and primers — interior, exterior, roof, floor and metal paint, and industrial and protective coatings.",
    href: "/paint-waterproofing",
    categorySlugs: ["waterproofing-sealants", "paint-coatings", ...range("paint-waterproofing")],
  },
  // Services & fit-out (CAT-43..56, docs/pricing/FITOUT_CATALOGUE.md).
  {
    slug: "electrical",
    inBar: true,
    shortName: "Electrical",
    name: "Electrical & Solar",
    blurb: "Cable, conduit, boards and breakers, switches, sockets and lighting, commercial and industrial LED, solar, generators, UPS and prepaid meters.",
    href: "/electrical",
    categorySlugs: ["electrical-cable-conduit", "electrical-distribution", "switches-sockets-lighting", "solar-backup-power", ...range("electrical")],
  },
  {
    slug: "hvac-ventilation",
    shortName: "HVAC",
    name: "HVAC & Ventilation",
    blurb: "Inverter split, cassette and ducted air conditioners, copper pair coil and accessories, extractor and inline fans, ducting, grilles, cowls and industrial fans.",
    href: "/hvac-ventilation",
    categorySlugs: range("hvac-ventilation"),
  },
  {
    slug: "tiles-flooring",
    inBar: true,
    shortName: "Tiles & Flooring",
    name: "Tiles & Flooring",
    blurb: "Ceramic and porcelain tiles, laminate and vinyl, carpet and carpet tiles, commercial vinyl, rubber and epoxy floors, skirting and trims.",
    href: "/tiles-flooring",
    categorySlugs: ["floor-wall-tiles", "flooring-skirting", "tiling-accessories", ...range("tiles-flooring")],
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
    slug: "kitchens-built-ins",
    shortName: "Kitchens",
    name: "Kitchens & Built-ins",
    blurb: "Kitchen base, wall and tall units, post-formed, granite and quartz worktops, built-in hobs, ovens and extractors, built-in cupboards and cabinet hardware.",
    href: "/kitchens-built-ins",
    categorySlugs: range("kitchens-built-ins"),
  },
  {
    slug: "hardware-fasteners",
    inBar: true,
    shortName: "Hardware",
    name: "Hardware & Fasteners",
    blurb: "Nails (also by the kg), screws, anchors, high-tensile bolts, coach screws and rivets, and locks, hinges, handles, padlocks and door hardware.",
    href: "/hardware-fasteners",
    categorySlugs: ["fasteners-fixings", "locks-ironmongery", ...range("hardware-fasteners")],
  },
  {
    slug: "boards-formwork",
    shortName: "Boards",
    name: "Boards & Sheet Materials",
    blurb: "Shutterply and shutterboard, pine and marine plywood, OSB, chipboard, melamine, MDF, Masonite and fibre-cement boards — by the sheet.",
    href: "/boards-formwork",
    categorySlugs: ["boards-sheets"],
  },
  // Wave A and D departments (docs/pricing/RANGE_EXPANSION.md).
  {
    slug: "garden-landscaping",
    inBar: true,
    shortName: "Garden",
    name: "Garden, Lawn & Landscaping",
    blurb: "Instant lawn and seed, topsoil, compost and mulch, fertiliser, irrigation and hoses, planters, edging and artificial grass, and garden tools and machines.",
    href: "/garden-landscaping",
    categorySlugs: range("garden-landscaping"),
  },
  {
    slug: "outdoor-living",
    shortName: "Outdoor Living",
    name: "Outdoor Living",
    blurb: "Braais, fireplaces and flues, shade sails, carports and polycarbonate, pools, pool care and water features, and outdoor finishes and lighting.",
    href: "/outdoor-living",
    categorySlugs: range("outdoor-living"),
  },
  {
    slug: "prefab-structures",
    shortName: "Prefab",
    name: "Prefab Buildings & Structures",
    blurb: "Wendy houses, steel sheds, carports and garages, light steel frame systems, and modular classrooms, offices, clinics and container conversions.",
    href: "/prefab-structures",
    categorySlugs: range("prefab-structures"),
  },
  {
    slug: "agricultural-farm",
    shortName: "Farm",
    name: "Agricultural & Farm",
    blurb: "Farm gates, field and game fence, wire and posts, cattle grids, troughs and dam liners, reservoirs, shade net, tunnels and crop protection.",
    href: "/agricultural-farm",
    categorySlugs: range("agricultural-farm"),
  },
  {
    slug: "mining-industrial",
    shortName: "Mining & Industrial",
    name: "Mining & Industrial",
    blurb: "Steel grating and stair treads, shotcrete, roof bolts and support mesh, ventilation duct, mining PPE, industrial floors, linings and warehouse safety.",
    href: "/mining-industrial",
    categorySlugs: range("mining-industrial"),
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
