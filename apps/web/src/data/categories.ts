export type Category = {
  slug: string;
  name: string;
  description: string;
  /** core = the aggregate catalogue (pricing framework workbook); b2b-bulk = packaged cement, binders and chemicals; ready-mix = CAT-12 concrete. */
  catalogueGroup: "core" | "b2b-bulk" | "ready-mix" | "steel" | "masonry" | "roofing" | "supplies";
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
  // CAT-15..18 — reinforcing and structural steel (STEEL_CATALOGUE.md).
  { slug: "reinforcing-bar", name: "Reinforcing Bar (Rebar)", description: "SANS 920 high-tensile Y-bar and mild-steel R-bar, 8 to 40 mm — by the 6 m or 12 m length or by the tonne.", catalogueGroup: "steel" },
  { slug: "mesh-brickforce", name: "Mesh & Brickforce", description: "SANS 1024 welded mesh from Ref 100 to Ref 888 in 6.0 x 2.4 m sheets, and brickforce rolls for masonry.", catalogueGroup: "steel" },
  { slug: "steel-fixing-accessories", name: "Steel Fixing Accessories", description: "Tie wire, bar chairs and spacers, cover blocks, safety caps, couplers, dowels, starter bars, wall ties and hoop iron.", catalogueGroup: "steel" },
  { slug: "structural-steel", name: "Structural Steel", description: "Angles, tubes, flat and round bar, IPE beams, H-sections, channels and plate — by the length or tonne.", catalogueGroup: "steel" },
  // CAT-19/20 — masonry (MASONRY_CATALOGUE.md).
  { slug: "bricks-blocks", name: "Bricks & Blocks", description: "SANS 227 clay stock and face bricks and SANS 1215 cement bricks by the 1,000, and concrete blocks from 90 to 190 mm.", catalogueGroup: "masonry" },
  { slug: "lintels-dpc-wall-accessories", name: "Lintels, DPC & Wall Accessories", description: "Prestressed concrete lintels from 1.2 to 3.6 m, SANS 952 damp-proof course by the roll, and air bricks.", catalogueGroup: "masonry" },
  // CAT-21/22 — paving and retaining, in the same masonry & precast line (MASONRY_CATALOGUE.md).
  { slug: "paving-kerbs-edging", name: "Paving, Kerbs & Edging", description: "SANS 1058 concrete pavers, paving slabs, grass blocks, clay pavers, garden edging and SANS 927 road kerbs.", catalogueGroup: "masonry" },
  { slug: "retaining-erosion-control", name: "Retaining & Erosion Control", description: "Terraforce and segmental retaining blocks, gabion baskets and mattresses for walls, slopes and channels.", catalogueGroup: "masonry" },
  // CAT-23..25 — drainage and membranes, same line (MASONRY_CATALOGUE.md).
  { slug: "pipes-fittings", name: "Pipes & Fittings", description: "uPVC underground sewer and drain pipe in 6 m lengths, bends, junctions, rodding eyes and perforated subsoil drain pipe.", catalogueGroup: "masonry" },
  { slug: "precast-drainage", name: "Precast Drainage", description: "SANS 677 concrete pipes, manhole rings and covers, channel drains, V-drains and portal culverts.", catalogueGroup: "masonry" },
  { slug: "geosynthetics-membranes", name: "Geosynthetics & Membranes", description: "SABS damp-proof membrane for surface beds, nonwoven geotextile, weed-control fabric and geogrid.", catalogueGroup: "masonry" },
  // CAT-29 — concrete roof tiles, in the masonry & precast line (MASONRY_CATALOGUE.md).
  { slug: "concrete-roof-tiles", name: "Concrete Roof Tiles", description: "SANS 542 Double Roman and flat-profile concrete roof tiles, and matching ridge tiles.", catalogueGroup: "masonry" },
  // CAT-26..28 — roofing (ROOFING_CATALOGUE.md).
  { slug: "roof-sheeting", name: "Roof Sheeting", description: "IBR, corrugated and concealed-fix sheets from 0.30 to 0.80 mm — galvanised, Zincalume® or colour-coated — in standard lengths or cut to length.", catalogueGroup: "roofing" },
  { slug: "roof-flashings-fixings", name: "Flashings, Ridges & Fixings", description: "Ridge capping, barge and over-tile flashings, closures, roofing screws and hook bolts.", catalogueGroup: "roofing" },
  { slug: "roof-insulation-rainwater", name: "Insulation, Underlay & Rainwater", description: "135 mm ceiling insulation, foil underlay and under-tile membrane, and PVC gutters and downpipes.", catalogueGroup: "roofing" },
  // CAT-30/31 — roof & structural timber, sold with roofing (ROOFING_CATALOGUE.md).
  { slug: "structural-timber", name: "Roof & Structural Timber", description: "SA pine from 38 × 38 mm brandering to 50 × 228 mm beams — S5 or S7, H2 or H3, sized or rough-sawn, in lengths from 3.0 to 6.6 m.", catalogueGroup: "roofing" },
  { slug: "timber-connectors", name: "Timber Connectors & Accessories", description: "Truss and joist hangers, truss clips, hoop iron, galvanised nails and bolts, cut-end preservative and fibre-cement fascia.", catalogueGroup: "roofing" },
  // CAT-32..42 — building supplies, six departments (BUILDING_SUPPLIES_CATALOGUE.md).
  { slug: "doors-frames", name: "Doors & Door Frames", description: "Interior and exterior doors in the standard 813 × 2032 mm size, aluminium sliding doors, and steel door frames for half- and full-brick walls.", catalogueGroup: "supplies" },
  { slug: "windows-frames", name: "Windows & Window Frames", description: "SANS 727 steel windows in the F7 profile — NE, NC and ND types — and bronze aluminium windows.", catalogueGroup: "supplies" },
  { slug: "fencing-wire-posts", name: "Fencing, Wire & Posts", description: "Diamond mesh, galvanised and barbed wire, razor wire, Y-standards, droppers, and palisade posts and panels.", catalogueGroup: "supplies" },
  { slug: "gates-security", name: "Gates & Security", description: "Diamond-mesh pedestrian and driveway gates, and doorway security gates.", catalogueGroup: "supplies" },
  { slug: "water-tanks-geysers", name: "Water Tanks & Geysers", description: "Vertical polyethylene water tanks from 2,400 to 5,000 L, and 150 L geysers.", catalogueGroup: "supplies" },
  { slug: "water-supply-soil-pipe", name: "Water Supply & Soil Pipe", description: "Polycop hot- and cold-water pipe, copper tube, and 110 mm soil and vent pipe.", catalogueGroup: "supplies" },
  { slug: "ceilings-drywall", name: "Ceilings, Drywall & Cornice", description: "Gyproc RhinoBoard, cove cornice, RhinoLite skimming plaster, PVC ceiling boards and cornice adhesive.", catalogueGroup: "supplies" },
  { slug: "site-tools", name: "Site Tools & Consumables", description: "Bolsters, spirit levels, builder's line, trowels, hammers, shovels, spades and wheelbarrows.", catalogueGroup: "supplies" },
  { slug: "ppe-site-safety", name: "PPE & Site Safety", description: "Hard hats, reflective vests, safety boots, gloves, glasses, dust masks and barrier tape.", catalogueGroup: "supplies" },
  { slug: "waterproofing-sealants", name: "Waterproofing & Sealants", description: "Silicone and acrylic sealants, expanding foam, bitumen waterproofing, torch-on and reinforcing membrane.", catalogueGroup: "supplies" },
  { slug: "paint-coatings", name: "Paint & Coatings", description: "Interior and exterior acrylics, roof paint, plaster primer and enamel.", catalogueGroup: "supplies" },
];

export const CORE_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "core");
export const B2B_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "b2b-bulk");
export const READY_MIX_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "ready-mix");
export const STEEL_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "steel");
export const MASONRY_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "masonry");
export const ROOFING_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "roofing");
export const SUPPLIES_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "supplies");
