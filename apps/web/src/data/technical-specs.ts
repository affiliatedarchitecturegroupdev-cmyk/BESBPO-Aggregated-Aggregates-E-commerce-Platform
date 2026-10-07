/**
 * Technical specification content for the product pages: typical particle
 * size, typical uses, and handling and storage. These are standard
 * material-class facts, not pricing — but real quarry output varies, so
 * every product page says to confirm against the batch Certificate of
 * Analysis before specifying structural or engineered work.
 *
 * Category defaults apply unless a SKU overrides a field.
 */
export type TechnicalSpec = { particleSize: string; typicalUses: string[]; handling: string };

const CATEGORY_SPECS: Record<string, TechnicalSpec> = {
  "sub-base-base-course": {
    particleSize: "Continuously graded gravel or crushed stone to the stated G-class",
    typicalUses: ["Road base and sub-base layers", "Pavement layer works, residential to industrial", "Platforms, yards and compacted fill"],
    handling:
      "Place in layers and compact near optimum moisture content to the specified density (typically 93–98% Mod AASHTO for base, lower for sub-base and fill). Stockpile on a free-draining base and avoid over-handling, which segregates the grading.",
  },
  "crushed-stone": {
    particleSize: "Single-sized crushed stone at the stated nominal size",
    typicalUses: ["Concrete aggregate — structural and mass concrete", "Surfacing chips and surface-bed stone", "Drainage and backfill"],
    handling:
      "Angular crushed shape gives strong interlock. Keep sizes in separate stockpiles and avoid long free-fall drops, which break edges and add fines to the grading.",
  },
  "sand-fine-aggregates": {
    particleSize: "Fine aggregate, 0–4.75mm",
    typicalUses: ["Concrete and mortar mixes", "Plaster and screeds", "Bedding for paving and pipework"],
    handling:
      "Store covered or on a hard stand so moisture content stays consistent for reliable mix design. Keep separate from stone stockpiles to avoid contamination.",
  },
  "crusher-run-road-building": {
    particleSize: "Continuously graded crushed rock, stone to fines",
    typicalUses: ["Road base and sub-base layers", "Driveways, haul roads and parking areas", "General compacted fill"],
    handling:
      "Contains fines for good compaction — place and compact in 150–200mm layers at optimum moisture for best density.",
  },
  "ballast-rail": {
    particleSize: "Coarse crushed stone or mixed ballast, as stated",
    typicalUses: ["Concrete and general building work", "Track-bed ballast", "Hardstanding and fill"],
    handling: "Tip close to the point of use to limit handling. Hard-rock ballast should not be dropped from height, which crushes edges and adds fines.",
  },
  "drainage-filter": {
    particleSize: "Clean, single-sized stone with minimal fines",
    typicalUses: ["French drains and subsoil drainage", "Soakaways and septic beds", "Filter and bedding layers"],
    handling:
      "Keep clean — fines reduce permeability. Wrap drains in geotextile fabric on site so surrounding soil doesn't silt the stone up over time.",
  },
  "decorative-landscaping": {
    particleSize: "Decorative stone at the stated size",
    typicalUses: ["Garden beds and landscaping", "Water features and edging", "Low-traffic paths and mulching"],
    handling:
      "Not for structural compaction. Lay over a weed-control membrane, and rinse before placing to settle dust and bring out the colour.",
  },
  "agricultural-industrial": {
    particleSize: "Finely milled powder",
    typicalUses: ["Soil pH correction", "Calcium and magnesium supplementation", "Industrial and construction uses (select grades)"],
    handling:
      "Keep dry until spreading. Wear a dust mask, gloves and eye protection when handling and broadcasting; apply at rates from a soil test.",
  },
  "recycled-sustainable": {
    particleSize: "Recycled material, typically 0–37.5mm, graded as crushed",
    typicalUses: ["Sub-base and fill on recycled-content projects", "Temporary haul roads and site access", "General backfill"],
    handling:
      "Quality varies by crushing batch — request the latest test results before structural use. Compacts much like virgin gravel of a similar grading.",
  },
};

const SKU_SPECS: Record<string, Partial<TechnicalSpec>> = {
  "AA-SBC-01": { particleSize: "Crushed stone, 0–37.5mm, G1 grading (TRH14)", typicalUses: ["High-quality base course for heavily trafficked roads", "Premium pavement and airfield layers", "Industrial hardstands"] },
  "AA-SBC-02": { particleSize: "Crushed stone, 0–37.5mm, G2 grading (TRH14)" },
  "AA-SBC-03": { particleSize: "Crushed stone, 0–37.5mm, G3 grading (TRH14)" },
  "AA-SBC-04": { particleSize: "Crushed natural gravel, 0–53mm, G4 grading (TRH14)" },
  "AA-SBC-05": { particleSize: "Natural gravel, 0–63mm, G5 grading (TRH14)" },
  "AA-SBC-06": { particleSize: "Natural gravel, 0–63mm, G6 grading (TRH14)" },
  "AA-SBC-07": { particleSize: "Natural gravel, G7 (maximum size about two-thirds of the compacted layer)", typicalUses: ["Selected layers and sub-base", "Upper fill beneath pavement layers", "Farm and estate roads"] },
  "AA-SBC-08": { particleSize: "Gravel fill, G8 (maximum size about two-thirds of the compacted layer)", typicalUses: ["Selected fill and sub-grade", "Bulk earthworks", "Platform build-up"] },
  "AA-SBC-09": { particleSize: "Gravel fill, G9 (maximum size about two-thirds of the compacted layer)", typicalUses: ["Fill and sub-grade", "Bulk earthworks", "Backfilling"] },
  "AA-SBC-10": { particleSize: "Selected fill / sub-grade material, G10", typicalUses: ["Sub-grade and roadbed", "Bulk fill", "Landscaping earthworks"] },
  "AA-CRS-01": { particleSize: "Single-sized, nominal 6.7mm", typicalUses: ["Fine concrete and precast", "Surface dressing chips", "Bedding and blinding"] },
  "AA-CRS-02": { particleSize: "Single-sized, nominal 9.5mm", typicalUses: ["Concrete for thin sections and precast", "Surface dressing chips", "Pipe bedding"] },
  "AA-CRS-03": { particleSize: "Single-sized, nominal 13.2mm", typicalUses: ["General concrete", "Asphalt and surfacing aggregate", "Drainage"] },
  "AA-CRS-04": { particleSize: "Single-sized, nominal 19mm (dolomite)" },
  "AA-CRS-05": { particleSize: "Single-sized, nominal 19mm (andesite/hornfels)", typicalUses: ["High-strength and structural concrete", "Asphalt and surfacing aggregate", "Drainage"] },
  "AA-CRS-06": { particleSize: "Single-sized, nominal 19mm (granite)" },
  "AA-CRS-07": { particleSize: "Single-sized, nominal 26.5mm", typicalUses: ["Mass and foundation concrete", "Drainage and soakaways", "Hardstanding"] },
  "AA-CRS-08": { particleSize: "Single-sized, nominal 37.5mm", typicalUses: ["Mass concrete", "Drainage and gabion backing", "Hardstanding"] },
  "AA-CRS-09": { particleSize: "Single-sized, nominal 53mm", typicalUses: ["Mass concrete and heavy fill", "Drainage beds", "Erosion protection backing"] },
  "AA-CRS-10": { particleSize: "Crusher dust, 0–4.75mm (stone fines)", typicalUses: ["Paving and pipe bedding", "Blinding and levelling", "Fine fill and dust for asphalt"], handling: "Compacts well damp. Store covered in dry weather to keep dust down." },
  "AA-CRS-11": {
    particleSize: "Coarse selected oversize rock, typically 150–300mm",
    typicalUses: ["Pioneer layers over soft ground", "Haul-road and platform foundations", "Erosion protection and heavy fill"],
    handling: "Tip and spread with an excavator or dozer, then choke the surface with finer material before the next layer. Not for concrete.",
  },
  "AA-SND-01": { particleSize: "Washed natural river sand, 0–4.75mm", handling: "Washed to reduce silt and clay. Store covered or on a hard stand to keep moisture consistent for mix design." },
  "AA-SND-02": { particleSize: "Fine plaster sand, typically 0–2mm", typicalUses: ["Internal and external plaster", "Bricklaying mortar", "Fine screeds"] },
  "AA-SND-03": { particleSize: "Unwashed building sand, 0–4.75mm, contains fines", typicalUses: ["Bricklaying mortar", "General building work", "Bedding"] },
  "AA-SND-04": { particleSize: "Filling sand, ungraded, 0–4.75mm", typicalUses: ["Trench and general backfill", "Levelling beneath slabs", "Landscaping fill"], handling: "Compact in thin layers; wet slightly to help compaction." },
  "AA-SND-05": { particleSize: "Concrete sand, 0–4.75mm, graded for concrete", typicalUses: ["Structural and general concrete", "Precast products", "Screeds"] },
  "AA-SND-06": { particleSize: "Screeding sand, 0–4.75mm, well graded", typicalUses: ["Floor screeds", "Paving bedding", "Levelling courses"] },
  "AA-SND-08": {
    particleSize: "Graded bedding sand to SANS 1200 LB",
    typicalUses: ["Pipe bedding and surround", "Trench bedding for services", "Cable and conduit bedding"],
    handling: "Place in layers around the pipe and compact by hand so there are no voids under the haunches. Keep it free of stones and clods.",
  },
  "AA-SND-07": {
    particleSize: "High-silica sand, fine; grading varies by grade (typically 0.1–0.6mm)",
    typicalUses: ["Industrial flooring and grouts", "Water filtration media", "Sandblasting and specialty mortars"],
    handling: "Keep dry and sealed to prevent clumping. Use dust control (respirator, ventilation): respirable crystalline silica is a regulated hazard under SA OHS regulations.",
  },
  "AA-CRR-01": { particleSize: "Crusher run, 0–19mm, continuously graded" },
  "AA-CRR-02": { particleSize: "Crusher run, 0–40mm, continuously graded" },
  "AA-CRR-03": { particleSize: "Large quarried rock, sized to the design (typically 150mm upward)", typicalUses: ["River-bank and slope erosion protection", "Stormwater outlets and culverts", "Coastal and channel armouring"], handling: "Placed by excavator, not tipped from height onto finished surfaces. Sizes and grading follow the engineer's specification." },
  "AA-CRR-04": { particleSize: "Hard durable stone, typically 100–250mm", typicalUses: ["Gabion and mattress fill", "Retaining and erosion-control structures", "Decorative stone walls"], handling: "Hand-pack the visible faces of gabions; stone must be larger than the mesh opening." },
  "AA-BAL-01": { particleSize: "Ferrocrete ballast — stone and sand mix for concrete", typicalUses: ["Foundation and general concrete", "Slabs and footings", "DIY concrete"] },
  "AA-BAL-02": { particleSize: "Single-sized hard-rock ballast, typically 37.5–63mm", typicalUses: ["Railway track bed", "Heavy-duty drainage layers", "Erosion control"] },
  "AA-BAL-03": { particleSize: "Mixed building rubble and ballast, ungraded", typicalUses: ["Bulk fill and platforms", "Temporary site access", "Void filling"], handling: "Variable material — not for structural or engineered layers." },
  "AA-DRN-01": { particleSize: "Clean stone, typically 19–38mm" },
  "AA-DRN-02": { particleSize: "Graded filter aggregate to the filter design", typicalUses: ["Filter drains and water treatment beds", "Soakaways", "Filter layers behind retaining walls"] },
  "AA-DRN-03": { particleSize: "Clean bedding stone, typically 9.5–19mm", typicalUses: ["Bedding and surround for perforated drain pipe", "Weeping-tile drains", "Foundation drainage"] },
  "AA-DRN-04": { particleSize: "Clean stone, typically 19–38mm", typicalUses: ["Subsoil drainage trenches", "Sports-field and landscape drainage", "Road-side drains"] },
  "AA-DRN-05": {
    particleSize: "Washed stone, 19–26.5mm, soakaway specification",
    typicalUses: ["Soakaways and filter layers", "Septic and stormwater drainage fields", "Retaining-wall and subsoil drainage backfill"],
    handling: "Clean stone with minimal fines keeps it permeable. Wrap in geotextile on site so silt can't clog it over time.",
  },
  "AA-DEC-01": { particleSize: "Rounded river pebble, typically 20–40mm" },
  "AA-DEC-02": { particleSize: "Decorative crushed chips, typically 6–19mm" },
  "AA-DEC-03": { particleSize: "Rounded pea gravel, typically 6–10mm", typicalUses: ["Paths and driveways (over a stabilised base)", "Garden beds", "Play areas and drainage"] },
  "AA-DEC-04": { particleSize: "Mineral stone mulch, typically 10–30mm", typicalUses: ["Water-wise mulching", "Garden beds", "Pot and planter topping"] },
  "AA-AGR-01": { particleSize: "Finely milled calcitic lime" },
  "AA-AGR-02": { particleSize: "Finely milled dolomitic lime (calcium and magnesium)" },
  "AA-AGR-03": {
    particleSize: "Hydrated lime, fine powder",
    typicalUses: ["Mortar and plaster additive", "Soil stabilisation", "Water treatment and industrial uses"],
    handling: "Caustic — wear gloves, a dust mask and eye protection. Keep bags sealed and dry; hydrated lime reacts with moisture and air.",
  },
  "AA-REC-01": { particleSize: "Recycled crushed concrete, typically 0–37.5mm" },
  "AA-REC-02": { particleSize: "Recycled crushed brick, typically 0–37.5mm", typicalUses: ["Fill and sub-grade", "Temporary roads", "Landscaping and drainage fill"] },
  "AA-REC-03": { particleSize: "Asphalt millings, typically 0–25mm", typicalUses: ["Farm and estate roads", "Parking areas and paths", "Base for recycled asphalt layers"], handling: "Compacts best when warm; roll in layers. Binds over time as residual bitumen settles." },
};

export function technicalSpec(sku: string, categorySlug: string): TechnicalSpec | null {
  const base = CATEGORY_SPECS[categorySlug];
  if (!base) return null;
  return { ...base, ...SKU_SPECS[sku] };
}
