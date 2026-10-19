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
  { slug: "mortars-grouts-admixtures", name: "Mortars, Grouts & Admixtures", description: "Structural non-shrink grout, tile adhesives and grouts, premixed plaster and screed, bonding liquids, repair mortar, curing compound and bulk concrete admixtures.", catalogueGroup: "b2b-bulk" },
  // CAT-12 — per m³ by strength grade, full mixer-truck loads (READY_MIX_CATALOGUE.md).
  { slug: "ready-mix-concrete", name: "Ready-Mix Concrete", description: "SANS 878 ready-mixed concrete from 10 to 40 MPa, delivered by mixer truck in full loads — pump hire on request.", catalogueGroup: "ready-mix" },
  // CAT-15..18 — reinforcing and structural steel (STEEL_CATALOGUE.md).
  { slug: "reinforcing-bar", name: "Reinforcing Bar (Rebar)", description: "SANS 920 high-tensile Y-bar and mild-steel R-bar, 8 to 40 mm — by the 6 m or 12 m length or by the tonne.", catalogueGroup: "steel" },
  { slug: "mesh-brickforce", name: "Mesh & Brickforce", description: "SANS 1024 welded mesh from Ref 100 to Ref 888 in 6.0 x 2.4 m sheets, and brickforce rolls for masonry.", catalogueGroup: "steel" },
  { slug: "steel-fixing-accessories", name: "Steel Fixing Accessories", description: "Tie wire, bar chairs, high chairs and spacers, cover blocks, safety caps, couplers, dowels, starter bars, wall ties, hoop iron, anchor bolts and chemical anchors.", catalogueGroup: "steel" },
  { slug: "structural-steel", name: "Structural Steel", description: "Equal and unequal angles, flat, round and square bar, square, rectangular and round tube, IPE beams, UB and UC sections, PFC and lipped channels, plate, sheet, checker plate and expanded mesh — by the length or tonne.", catalogueGroup: "steel" },
  // CAT-19/20 — masonry (MASONRY_CATALOGUE.md).
  { slug: "bricks-blocks", name: "Bricks & Blocks", description: "SANS 227 clay stock, face, NFX, semi-face and plaster bricks and SANS 1215 cement bricks by the 1,000, brick cladding, and hollow, solid, half, U and fair-face concrete blocks from 90 to 190 mm.", catalogueGroup: "masonry" },
  { slug: "lintels-dpc-wall-accessories", name: "Lintels, DPC & Wall Accessories", description: "Prestressed concrete lintels from 0.9 to 6.6 m in 110 mm, maxi 140 mm and wide 150 mm sections, block lintels, SANS 952 damp-proof course from 110 to 600 mm, and air bricks.", catalogueGroup: "masonry" },
  // CAT-21/22 — paving and retaining, in the same masonry & precast line (MASONRY_CATALOGUE.md).
  { slug: "paving-kerbs-edging", name: "Paving, Kerbs & Edging", description: "SANS 1058 concrete pavers in 50 to 80 mm and four colours, clay pavers, paving slabs, garden pavers, cobbles and stepping stones, grass blocks, garden edging, SANS 927 road kerbs and channel blocks.", catalogueGroup: "masonry" },
  { slug: "retaining-erosion-control", name: "Retaining & Erosion Control", description: "Terraforce L11, 4x4 and segmental retaining blocks, smooth and rock-face gravity blocks, gabion baskets and Reno mattresses for walls, slopes and channels.", catalogueGroup: "masonry" },
  // CAT-23..25 — drainage and membranes, same line (MASONRY_CATALOGUE.md).
  { slug: "pipes-fittings", name: "Pipes & Fittings", description: "uPVC Class 34 sewer and drain pipe from 110 to 250 mm in 6 m lengths, bends, junctions, couplers, inspection eyes, gullies, vent valves and perforated subsoil drain pipe.", catalogueGroup: "masonry" },
  { slug: "precast-drainage", name: "Precast Drainage", description: "SANS 677 concrete pipes from 300 to 1,200 mm, manhole rings, slabs, bases and covers, catch pits, kerb and grid inlets, channel drains, U- and V-drains, portal culverts and headwalls.", catalogueGroup: "masonry" },
  { slug: "geosynthetics-membranes", name: "Geosynthetics & Membranes", description: "SABS damp-proof membrane in 250 and 375 µm, construction film, nonwoven and woven geotextiles, weed-control fabric, geogrid, geocell, erosion-control blankets and drainage composite.", catalogueGroup: "masonry" },
  // CAT-29 — concrete roof tiles, in the masonry & precast line (MASONRY_CATALOGUE.md).
  { slug: "concrete-roof-tiles", name: "Concrete Roof Tiles", description: "SANS 542 Double Roman, flat and slate-profile concrete roof tiles in several colours and finishes, with ridge, hip, verge and gable tiles, vents, clips and nails.", catalogueGroup: "masonry" },
  // CAT-26..28 — roofing (ROOFING_CATALOGUE.md).
  { slug: "roof-sheeting", name: "Roof Sheeting", description: "IBR, corrugated and concealed-fix sheets from 0.30 to 0.80 mm — galvanised, Zincalume® or colour-coated — in standard lengths or cut to length.", catalogueGroup: "roofing" },
  { slug: "roof-flashings-fixings", name: "Flashings, Ridges & Fixings", description: "Ridge capping, barge, valley, apron and eaves flashings, closures, concealed-fix clips, roofing screws, washers and hook bolts, fascia boards, translucent polycarbonate sheets and whirlybird ventilators.", catalogueGroup: "roofing" },
  { slug: "roof-insulation-rainwater", name: "Insulation, Underlay & Rainwater", description: "Glass-wool and polyester ceiling insulation from 50 to 145 mm, foil underlay, under-tile membrane and insulation board, and PVC, aluminium and galvanised gutters, downpipes and fittings.", catalogueGroup: "roofing" },
  // CAT-30/31 — roof & structural timber, sold with roofing (ROOFING_CATALOGUE.md).
  { slug: "structural-timber", name: "Roof & Structural Timber", description: "SA pine from 38 × 38 mm brandering to 50 × 228 mm beams — S5 or S7, H2 or H3, sized or rough-sawn, in lengths from 3.0 to 6.6 m.", catalogueGroup: "roofing" },
  { slug: "timber-connectors", name: "Timber Connectors & Accessories", description: "Truss and joist hangers, truss clips, hoop iron, galvanised nails and bolts, cut-end preservative and fibre-cement fascia.", catalogueGroup: "roofing" },
  // CAT-32..42 — building supplies, six departments (BUILDING_SUPPLIES_CATALOGUE.md).
  { slug: "doors-frames", name: "Doors & Door Frames", description: "Interior, exterior, stable, glazed, fire and security doors in the standard 813 × 2032 mm size, pivot doors, aluminium and wooden sliding doors, garage doors, and steel door frames for half- and full-brick walls.", catalogueGroup: "supplies" },
  { slug: "windows-frames", name: "Windows & Window Frames", description: "SANS 727 steel windows in the F7 and FX7 profiles, the full wooden window schedule, and top-hung, obscure-glass and bronze aluminium windows from 600 to 2,100 mm with sidelights.", catalogueGroup: "supplies" },
  { slug: "fencing-wire-posts", name: "Fencing, Wire & Posts", description: "Diamond, PVC-coated, welded and clear-view mesh from 0.9 to 2.4 m, wire netting, galvanised, barbed and razor wire, Y-standards, straining posts, droppers, palisade panels and posts, and electric fencing.", catalogueGroup: "supplies" },
  { slug: "gates-security", name: "Gates & Security", description: "Diamond-mesh, palisade and steel swing and sliding gates, trellis and doorway security gates, gate motors, rollers and track, and diamond and brick-pattern burglar bars.", catalogueGroup: "supplies" },
  { slug: "water-tanks-geysers", name: "Water Tanks & Geysers", description: "Vertical, slimline and horizontal water tanks from 250 to 10,000 L, septic tanks, electric geysers from 50 to 250 L, solar geysers, and geyser elements, valves and installation kits.", catalogueGroup: "supplies" },
  { slug: "water-supply-soil-pipe", name: "Water Supply & Soil Pipe", description: "Polycop hot- and cold-water pipe, Class 0 copper tube and fittings, gate and ball valves, HDPE water pipe, Class 9 and 12 uPVC pressure pipe, and soil, vent and waste pipe.", catalogueGroup: "supplies" },
  { slug: "ceilings-drywall", name: "Ceilings, Drywall & Cornice", description: "RhinoBoard, standard, moisture-resistant and fire-rated gypsum board, fibre-cement and PVC ceiling boards, gypsum, Rhino and polystyrene cornice, drywall studs and tracks, RhinoLite and cornice adhesive.", catalogueGroup: "supplies" },
  { slug: "site-tools", name: "Site Tools & Consumables", description: "Trowels, floats, levels, tape measures, hammers, bolsters, picks and crowbars, shovels and spades, wheelbarrows, mixing tubs, tile cutters, grinders, blades and drill bits.", catalogueGroup: "supplies" },
  { slug: "ppe-site-safety", name: "PPE & Site Safety", description: "Hard hats, reflective vests and jackets, safety boots and gumboots, gloves, glasses, goggles, dust masks and respirators, hearing protection, harnesses, first-aid kits, fire extinguishers, signage and barriers.", catalogueGroup: "supplies" },
  { slug: "waterproofing-sealants", name: "Waterproofing & Sealants", description: "Silicone, acrylic and polyurethane sealants, expanding foam, bitumen and liquid waterproofing, torch-on and reinforcing membrane, primers, flashing tape, damp-proofing liquid and joint fillers.", catalogueGroup: "supplies" },
  { slug: "paint-coatings", name: "Paint & Coatings", description: "Interior PVA and acrylics, exterior, textured and roof paint, primers and undercoats, enamels, wood sealer and varnish, floor, paving and road-marking paint, thinners and painting tools.", catalogueGroup: "supplies" },
];

export const CORE_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "core");
export const B2B_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "b2b-bulk");
export const READY_MIX_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "ready-mix");
export const STEEL_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "steel");
export const MASONRY_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "masonry");
export const ROOFING_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "roofing");
export const SUPPLIES_CATEGORIES = CATEGORIES.filter((c) => c.catalogueGroup === "supplies");
