/**
 * Complete the job (COMPLETE_THE_JOB.md): on every product page, the other
 * materials the same job needs — from any line, not just the product's own
 * category — each with the reason it belongs. A product maps to a job by
 * its SKU where the category holds products for different jobs (plaster
 * sand vs pipe bedding sand), otherwise by its category. Jobs use the same
 * build stages as project lists, so the set saves straight to a project.
 */
import { findQuotable } from "@/data/quotable";
import { STAGES, type BuildStage } from "@/lib/project-lists";

type Companion = { sku: string; why: string; unit?: string };
type Job = { title: string; stage: Exclude<BuildStage, "OTHER">; companions: Companion[] };

/** Shown at most; the product itself and hidden products drop out first. */
const MAX = 6;

const JOBS = {
  earthworks: {
    title: "Level and build up the site",
    stage: "SITE_PREP",
    companions: [
      { sku: "AA-SBC-10", why: "Selected fill to bring the site up to level" },
      { sku: "AA-SBC-07", why: "Compacted sub-base layer to build on" },
      { sku: "AA-SBC-05", why: "Selected layer over the fill" },
      { sku: "AA-CRS-11", why: "Pioneer layer where the ground is soft" },
      { sku: "AA-GEO-NONWOVEN-A2", why: "Separates the layers from soft subgrade", unit: "ROLL" },
      { sku: "AA-REC-01", why: "Recycled alternative for fill" },
    ],
  },
  layerworks: {
    title: "Build the layers for a driveway or road",
    stage: "PAVING_ROADS",
    companions: [
      { sku: "AA-SBC-07", why: "Sub-base under the base course" },
      { sku: "AA-CRR-01", why: "Base course, compacted on the sub-base" },
      { sku: "AA-SND-01", why: "Sand bedding under the pavers" },
      { sku: "AA-PAV-INTERLOCK-60", why: "Driveway pavers for the surface" },
      { sku: "AA-PAV-ROAD-KERB", why: "Kerbs to hold the edges" },
      { sku: "AA-GEO-GEOGRID", why: "Reinforces the layers over weak ground", unit: "ROLL" },
    ],
  },
  roadStabilising: {
    title: "Stabilise the road layers",
    stage: "PAVING_ROADS",
    companions: [
      { sku: "AA-SBC-05", why: "Natural gravel to stabilise with cement" },
      { sku: "AA-SBC-07", why: "Sub-base layer" },
      { sku: "AA-CRR-01", why: "Base course over the stabilised layer" },
      { sku: "AA-SBC-04", why: "Crushed gravel base for heavier traffic" },
      { sku: "AA-PAV-ROAD-KERB", why: "Kerbs along the road edge" },
    ],
  },
  paving: {
    title: "Lay the paving",
    stage: "PAVING_ROADS",
    companions: [
      { sku: "AA-SBC-07", why: "Compacted sub-base for driveways" },
      { sku: "AA-CRR-01", why: "Base course under the bedding" },
      { sku: "AA-SND-01", why: "25–30 mm sand bedding layer" },
      { sku: "AA-PAV-ROAD-KERB", why: "Kerbs to lock the edges in" },
      { sku: "AA-PAV-GARDEN-KERB", why: "Edging for paths and patios" },
      { sku: "AA-CEM-AFS-STARBUILD-325N", why: "Concrete haunching behind the kerbs", unit: "BAG_50KG" },
    ],
  },
  concrete: {
    title: "Mix and reinforce the concrete",
    stage: "FOUNDATIONS",
    companions: [
      { sku: "AA-CRS-04", why: "19 mm concrete stone" },
      { sku: "AA-SND-05", why: "Concrete sand for the mix" },
      { sku: "AA-CEM-AFS-ALLPURPOSE-425N", why: "Cement for structural concrete", unit: "BAG_50KG" },
      { sku: "AA-STL-Y12", why: "Main bars for footings and beams", unit: "LENGTH_6M" },
      { sku: "AA-STL-MESH-193", why: "Mesh for surface beds", unit: "SHEET" },
      { sku: "AA-STL-ACC-TIE-WIRE", why: "Ties the steel together" },
      { sku: "AA-RMX-25MPA-001", why: "Or order it ready-mixed by the truck" },
    ],
  },
  slab: {
    title: "Pour the slab",
    stage: "SLABS",
    companions: [
      { sku: "AA-STL-MESH-193", why: "Mesh for surface beds", unit: "SHEET" },
      { sku: "AA-STL-ACC-BAR-CHAIRS", why: "Holds the mesh at cover" },
      { sku: "AA-GEO-DPM-250", why: "Damp-proof membrane under the slab", unit: "ROLL" },
      { sku: "AA-SND-04", why: "Filling sand to blind the fill" },
      { sku: "AA-STL-ACC-TIE-WIRE", why: "Ties laps and bars" },
      { sku: "AA-SND-06", why: "Screed sand for the finish" },
      { sku: "AA-RMX-25MPA-001", why: "Ready-mix for the surface bed" },
    ],
  },
  steelFixing: {
    title: "Fix the steel and cast it",
    stage: "FOUNDATIONS",
    companions: [
      { sku: "AA-STL-ACC-TIE-WIRE", why: "Ties every crossing and lap" },
      { sku: "AA-STL-ACC-COVER-BLOCKS", why: "Keeps the steel at cover in footings" },
      { sku: "AA-STL-ACC-BAR-CHAIRS", why: "Supports top steel and mesh" },
      { sku: "AA-STL-ACC-SAFETY-CAPS", why: "Caps exposed bar ends on site" },
      { sku: "AA-STL-Y10", why: "Stirrups and distribution bars", unit: "LENGTH_6M" },
      { sku: "AA-STL-MESH-193", why: "Mesh for the surface bed", unit: "SHEET" },
      { sku: "AA-RMX-25MPA-001", why: "Ready-mix to cast it" },
    ],
  },
  baseplates: {
    title: "Fix the steelwork down",
    stage: "FOUNDATIONS",
    companions: [
      { sku: "AA-GRT-NSHRINK-001", why: "Non-shrink grout under baseplates" },
      { sku: "AA-RMX-25MPA-001", why: "Ready-mix for column footings" },
      { sku: "AA-STL-Y12", why: "Bars for the footings", unit: "LENGTH_6M" },
      { sku: "AA-STL-ACC-TIE-WIRE", why: "Ties the footing steel" },
    ],
  },
  walls: {
    title: "Build the walls",
    stage: "WALLS",
    companions: [
      { sku: "AA-MAS-CLAY-STOCK", why: "Clay stock bricks", unit: "THOUSAND" },
      { sku: "AA-MAS-BLOCK-140", why: "Or 140 mm blocks for faster walls", unit: "EACH" },
      { sku: "AA-SND-03", why: "Building sand for the mortar" },
      { sku: "AA-CEM-AFS-STARBUILD-325N", why: "Cement for mortar and plaster", unit: "BAG_50KG" },
      { sku: "AA-STL-BRICKFORCE-150", why: "Brickforce in the bed joints" },
      { sku: "AA-MAS-DPC-110", why: "Damp-proof course at floor level" },
      { sku: "AA-MAS-LINTEL-1200", why: "Lintels over doors and windows" },
      { sku: "AA-STL-ACC-WALL-TIES", why: "Ties for cavity and collar-jointed walls" },
    ],
  },
  plaster: {
    title: "Plaster the walls",
    stage: "WALLS",
    companions: [
      { sku: "AA-SND-02", why: "Plaster sand" },
      { sku: "AA-CEM-AFS-STARBUILD-325N", why: "Cement for the plaster mix", unit: "BAG_50KG" },
      { sku: "AA-AGR-03", why: "Hydrated lime for a workable plaster" },
      { sku: "AA-SND-03", why: "Building sand for any mortar repairs" },
    ],
  },
  drains: {
    title: "Lay the drain",
    stage: "DRAINAGE",
    companions: [
      { sku: "AA-DRN-PIPE-UG-110", why: "110 mm sewer and drain pipe", unit: "LENGTH_6M" },
      { sku: "AA-DRN-BEND-110-45", why: "Bends for changes of direction" },
      { sku: "AA-DRN-JUNCTION-110", why: "Junctions where branches join" },
      { sku: "AA-DRN-RODDING-EYE-110", why: "Rodding eyes for access" },
      { sku: "AA-SND-08", why: "Bedding sand under and around the pipe" },
      { sku: "AA-PRC-MANHOLE-COVER", why: "Cover and frame at the manhole" },
    ],
  },
  frenchDrain: {
    title: "Build the French drain",
    stage: "DRAINAGE",
    companions: [
      { sku: "AA-DRN-01", why: "Clean stone around the pipe" },
      { sku: "AA-GEO-NONWOVEN-A2", why: "Geotextile wrap keeps the soil out", unit: "ROLL" },
      { sku: "AA-DRN-SUBSOIL-110", why: "Perforated subsoil pipe" },
      { sku: "AA-DRN-PIPE-UG-110", why: "Solid pipe to the outlet", unit: "LENGTH_6M" },
      { sku: "AA-SND-08", why: "Bedding where the pipe runs solid" },
      { sku: "AA-PRC-CHANNEL-DRAIN-1M", why: "Channel drain for surface water" },
    ],
  },
  precast: {
    title: "Install the precast drainage",
    stage: "DRAINAGE",
    companions: [
      { sku: "AA-SND-08", why: "Bedding sand under the units" },
      { sku: "AA-RMX-15MPA-001", why: "Concrete for bedding, haunching and benching" },
      { sku: "AA-DRN-01", why: "Free-draining stone around the outlet" },
      { sku: "AA-GEO-NONWOVEN-A2", why: "Geotextile under the bedding", unit: "ROLL" },
      { sku: "AA-PRC-MANHOLE-COVER", why: "Cover and frame for the manhole" },
      { sku: "AA-DRN-PIPE-UG-160", why: "160 mm pipe for stormwater runs", unit: "LENGTH_6M" },
    ],
  },
  garden: {
    title: "Finish the garden and paths",
    stage: "LANDSCAPING",
    companions: [
      { sku: "AA-GEO-WEED-MAT", why: "Weed membrane under the stone", unit: "ROLL" },
      { sku: "AA-PAV-GARDEN-KERB", why: "Edging to keep the stone in place" },
      { sku: "AA-PAV-SLAB-450", why: "Stepping-stone slabs for paths" },
      { sku: "AA-CRS-10", why: "Crusher dust to bed the slabs" },
      { sku: "AA-DEC-03", why: "Pea gravel for paths" },
      { sku: "AA-DEC-01", why: "River pebble for the beds" },
      { sku: "AA-RET-TERRAFORCE-L22", why: "Plantable retaining for the slopes" },
    ],
  },
  retaining: {
    title: "Build the retaining wall",
    stage: "LANDSCAPING",
    companions: [
      { sku: "AA-CRR-01", why: "Compacted foundation for the first course" },
      { sku: "AA-DRN-01", why: "Drainage stone behind the wall" },
      { sku: "AA-DRN-SUBSOIL-110", why: "Subsoil pipe to drain the backfill" },
      { sku: "AA-GEO-NONWOVEN-A2", why: "Geotextile between soil and stone", unit: "ROLL" },
      { sku: "AA-GEO-GEOGRID", why: "Reinforces taller walls", unit: "ROLL" },
      { sku: "AA-RMX-15MPA-001", why: "Concrete for the footing" },
    ],
  },
  gabions: {
    title: "Build the gabions",
    stage: "LANDSCAPING",
    companions: [
      { sku: "AA-RET-GABION-BASKET", why: "Baskets for walls" },
      { sku: "AA-RET-GABION-MATTRESS", why: "Mattresses for channels and aprons" },
      { sku: "AA-CRR-04", why: "Gabion stone to fill them" },
      { sku: "AA-CRR-03", why: "Rip rap for scour protection" },
      { sku: "AA-GEO-NONWOVEN-A2", why: "Geotextile behind and under the gabions", unit: "ROLL" },
    ],
  },
  sheetRoofFixings: {
    title: "Finish the sheeted roof",
    stage: "ROOFING",
    companions: [
      { sku: "AA-ROF-RIDGE-IBR", why: "Ridge capping along the top" },
      { sku: "AA-ROF-CLOSURES-IBR", why: "Closures to seal the ribs at ridge and eaves" },
      { sku: "AA-ROF-SCREWS-TIMBER", why: "Roofing screws into the purlins", unit: "PACK" },
      { sku: "AA-ROF-UNDERLAY-FOIL", why: "Foil underlay against heat and condensation", unit: "ROLL" },
      { sku: "AA-ROF-INSUL-GLASSWOOL-135", why: "Ceiling insulation (SANS 10400-XA)", unit: "ROLL" },
      { sku: "AA-ROF-GUTTER-PVC-6M", why: "Gutters along the eaves" },
      { sku: "AA-ROF-DOWNPIPE-PVC-3M", why: "Downpipes from the gutters" },
    ],
  },
  roofTimber: {
    title: "Frame the roof",
    stage: "ROOFING",
    companions: [
      { sku: "AA-TMB-38114-S5-H2-SZ", why: "Rafters and kappa beams — S5 H2 for roofs under cover", unit: "TIMBER_6_6M" },
      { sku: "AA-TMB-3876-S5-H2-SZ", why: "Purlins under sheeting", unit: "TIMBER_6_6M" },
      { sku: "AA-TMB-3838-S5-H2-SZ", why: "Brandering for the ceiling", unit: "TIMBER_6_6M" },
      { sku: "AA-TMB-TRUSS-CLIP", why: "Truss clips onto the wall plate" },
      { sku: "AA-TMB-HOOP-IRON", why: "Hoop iron to tie the roof down", unit: "ROLL" },
      { sku: "AA-TMB-NAILS-75", why: "Galvanised nails for treated timber", unit: "PACK" },
      { sku: "AA-TMB-END-SEALER", why: "Preservative for every cut end" },
    ],
  },
  sheetRoof: {
    title: "Roof it with sheeting",
    stage: "ROOFING",
    companions: [
      { sku: "AA-ROF-IBR-047-GALV", why: "IBR roof sheets — or choose the profile and finish", unit: "SHEET_6_0M" },
      { sku: "AA-ROF-RIDGE-IBR", why: "Ridge capping along the top" },
      { sku: "AA-ROF-SCREWS-TIMBER", why: "Roofing screws into the purlins", unit: "PACK" },
      { sku: "AA-ROF-UNDERLAY-FOIL", why: "Foil underlay against heat and condensation", unit: "ROLL" },
      { sku: "AA-ROF-INSUL-GLASSWOOL-135", why: "Ceiling insulation (SANS 10400-XA)", unit: "ROLL" },
      { sku: "AA-ROF-GUTTER-PVC-6M", why: "Gutters along the eaves" },
      { sku: "AA-ROF-DOWNPIPE-PVC-3M", why: "Downpipes from the gutters" },
    ],
  },
  tiledRoof: {
    title: "Roof it with tiles",
    stage: "ROOFING",
    companions: [
      { sku: "AA-TIL-DOUBLE-ROMAN", why: "Concrete roof tiles, about 10 per m²" },
      { sku: "AA-TIL-RIDGE", why: "Ridge tiles to match" },
      { sku: "AA-ROF-UNDERLAY-MEMBRANE", why: "Under-tile membrane below the battens", unit: "ROLL" },
      { sku: "AA-ROF-INSUL-GLASSWOOL-135", why: "Ceiling insulation (SANS 10400-XA)", unit: "ROLL" },
      { sku: "AA-ROF-GUTTER-PVC-6M", why: "Gutters along the eaves" },
      { sku: "AA-ROF-DOWNPIPE-PVC-3M", why: "Downpipes from the gutters" },
    ],
  },
  rainwater: {
    title: "Take the rainwater away",
    stage: "ROOFING",
    companions: [
      { sku: "AA-ROF-GUTTER-PVC-6M", why: "Gutters along the eaves" },
      { sku: "AA-ROF-DOWNPIPE-PVC-3M", why: "Downpipes, about one per 10–12 m of gutter" },
      { sku: "AA-ROF-GUTTER-FITTINGS", why: "Brackets, outlets and corners" },
      { sku: "AA-DRN-PIPE-UG-110", why: "Underground pipe from the downpipe to the drain", unit: "LENGTH_6M" },
      { sku: "AA-DRN-01", why: "Stone for a soakaway" },
      { sku: "AA-GEO-NONWOVEN-A2", why: "Geotextile to wrap the soakaway", unit: "ROLL" },
    ],
  },
} satisfies Record<string, Job>;

export type JobKey = keyof typeof JOBS;

const BY_CATEGORY: Record<string, JobKey> = {
  "sub-base-base-course": "layerworks",
  "crushed-stone": "concrete",
  "sand-fine-aggregates": "walls",
  "crusher-run-road-building": "layerworks",
  "ballast-rail": "concrete",
  "drainage-filter": "frenchDrain",
  "decorative-landscaping": "garden",
  "recycled-sustainable": "earthworks",
  "cement-hydraulic-binders": "concrete",
  "mortars-grouts-admixtures": "concrete",
  "ready-mix-concrete": "slab",
  "reinforcing-bar": "steelFixing",
  "mesh-brickforce": "slab",
  "steel-fixing-accessories": "steelFixing",
  "structural-steel": "baseplates",
  "bricks-blocks": "walls",
  "lintels-dpc-wall-accessories": "walls",
  "paving-kerbs-edging": "paving",
  "retaining-erosion-control": "retaining",
  "pipes-fittings": "drains",
  "precast-drainage": "precast",
  "geosynthetics-membranes": "slab",
  "roof-sheeting": "sheetRoofFixings",
  "roof-flashings-fixings": "sheetRoof",
  "roof-insulation-rainwater": "sheetRoof",
  "concrete-roof-tiles": "tiledRoof",
  "structural-timber": "roofTimber",
  "timber-connectors": "roofTimber",
};

/** Products whose job differs from the rest of their category. */
const BY_SKU: Record<string, JobKey> = {
  "AA-SBC-08": "earthworks",
  "AA-SBC-09": "earthworks",
  "AA-SBC-10": "earthworks",
  "AA-CRS-10": "garden",
  "AA-CRS-11": "earthworks",
  "AA-SND-01": "paving",
  "AA-SND-02": "plaster",
  "AA-SND-04": "slab",
  "AA-SND-05": "concrete",
  "AA-SND-06": "slab",
  "AA-SND-08": "drains",
  "AA-CRR-03": "gabions",
  "AA-CRR-04": "gabions",
  "AA-AGR-03": "plaster",
  "AA-STL-BRICKFORCE-75": "walls",
  "AA-STL-BRICKFORCE-150": "walls",
  "AA-STL-BRICKFORCE-230": "walls",
  "AA-STL-ACC-WALL-TIES": "walls",
  "AA-STL-ACC-HOOP-IRON": "walls",
  "AA-RET-GABION-BASKET": "gabions",
  "AA-RET-GABION-MATTRESS": "gabions",
  "AA-DRN-SUBSOIL-110": "frenchDrain",
  "AA-PRC-CHANNEL-DRAIN-1M": "frenchDrain",
  "AA-GEO-NONWOVEN-A2": "frenchDrain",
  "AA-GEO-WEED-MAT": "garden",
  "AA-GEO-GEOGRID": "retaining",
  "AA-BND-ROADCAP-001": "roadStabilising",
  "AA-CEM-PPC-SUREROAD-325N": "roadStabilising",
  "AA-CEM-AFS-ROADSTAB-325N": "roadStabilising",
  "AA-CEM-AFRIMAT-ROADCEM-325N": "roadStabilising",
  "AA-CEM-CMZ-ROADPRO-325N": "roadStabilising",
  "AA-CEM-SEPHAKU-SEPROAD-325N": "roadStabilising",
  "AA-CEM-PPC-SUREWALL-225X": "walls",
  "AA-CEM-CMZ-MASONRY-225X": "walls",
  "AA-CEM-KWIKBUILD-MASONRY-225X": "walls",
  "AA-CEM-MAMBA-MASONRY-225X": "walls",
  "AA-ROF-GUTTER-PVC-6M": "rainwater",
  "AA-ROF-DOWNPIPE-PVC-3M": "rainwater",
  "AA-ROF-GUTTER-FITTINGS": "rainwater",
  "AA-ROF-UNDERLAY-MEMBRANE": "tiledRoof",
  "AA-STL-STR-LIPPED-CHANNEL": "sheetRoof",
};

/** Not building materials — silica sand goes to blasting and filtration — so no job is suggested. */
const NO_JOB = new Set(["AA-SND-07"]);

export type CompanionView = {
  sku: string;
  why: string;
  name: string;
  slug: string;
  categorySlug: string;
  unit: string;
  unitLabel: string;
  price: number | null;
  /** First quantity offered for the cart: the mixer-truck minimum for ready-mix, otherwise one. */
  quantity: number;
  /** Ticked for the cart to start with — not a full truck of ready-mix, which the customer opts into. */
  preselected: boolean;
};
export type CompleteTheJobView = {
  title: string;
  stage: BuildStage;
  stageLabel: string;
  companions: CompanionView[];
  /** Order pairings or staff pins lead the list (Best With) — not only the job's checklist. */
  bestWith?: boolean;
};

/** The job a product belongs to, with its companions resolved against the catalogue — plain data for a client component. */
export function completeTheJob(sku: string, categorySlug: string, hiddenSkus: string[] = []): CompleteTheJobView | null {
  const key = BY_SKU[sku] ?? BY_CATEGORY[categorySlug];
  if (!key || NO_JOB.has(sku)) return null;
  return resolveJob(key, [sku, ...hiddenSkus]);
}

export const JOB_KEYS = Object.keys(JOBS) as JobKey[];

/** The job a category belongs to, for department pages' "Complete the job" ideas. */
export function jobKeyForCategory(categorySlug: string): JobKey | null {
  return BY_CATEGORY[categorySlug] ?? null;
}

/** One job's companions resolved against the catalogue, leaving out the given SKUs — for the shopping assistant's "what do I need for…". */
export function resolveJob(key: JobKey, excludeSkus: string[] = []): CompleteTheJobView | null {
  const job: Job = JOBS[key];
  const companions = resolveCompanions(job.companions.filter((c) => !excludeSkus.includes(c.sku)));
  if (companions.length < 2) return null;
  const stageLabel = STAGES.find((s) => s.value === job.stage)!.label;
  return { title: job.title, stage: job.stage, stageLabel, companions };
}

function resolveCompanions(list: Companion[]): CompanionView[] {
  return list
    .flatMap((c) => {
      const product = findQuotable(c.sku);
      if (!product) return [];
      const unit = product.units.find((u) => u.code === c.unit) ?? product.units.find((u) => u.retailPrice !== null) ?? product.units[0];
      return [
        {
          sku: product.sku,
          why: c.why,
          name: product.name,
          slug: product.slug,
          categorySlug: product.categorySlug,
          unit: unit.code,
          unitLabel: unit.label.replace(/\s*\(.*\)$/, ""),
          price: unit.retailPrice,
          quantity: product.minimumQuantity ?? 1,
          preselected: unit.retailPrice !== null && !product.minimumQuantity,
        },
      ];
    })
    .slice(0, MAX);
}

/** A Best With suggestion from the API (docs/best-with.md): pinned by staff, or bought together in paid orders. */
export type BestWithSuggestion = { sku: string; source: "PINNED" | "ORDERS"; note: string | null };

/** How a suggestion is explained: staff's note, or that customers buy them together (with the job's reason when there is one). */
function suggestionWhy(s: BestWithSuggestion, fromJob?: Companion) {
  if (s.source === "PINNED") return s.note ?? fromJob?.why ?? "Recommended with this product";
  return fromJob ? `Often bought together · ${fromJob.why}` : "Often bought together";
}

/**
 * Best With on a product page: what customers actually buy with it (and
 * staff's pins) first, then the rest of the job's companions — so it works
 * before there are orders and gets sharper as they come in.
 */
export function bestWith(sku: string, categorySlug: string, hiddenSkus: string[] = [], suggestions: BestWithSuggestion[] = []): CompleteTheJobView | null {
  const key = jobKeyFor(sku, categorySlug);
  const exclude = new Set([sku, ...hiddenSkus]);
  const jobCompanions: Companion[] = key ? (JOBS[key] as Job).companions : [];
  const picked = new Map<string, Companion>();
  for (const s of suggestions) {
    if (exclude.has(s.sku) || picked.has(s.sku) || !findQuotable(s.sku)) continue;
    const fromJob = jobCompanions.find((c) => c.sku === s.sku);
    picked.set(s.sku, { sku: s.sku, why: suggestionWhy(s, fromJob), unit: fromJob?.unit });
  }
  const fromOrders = picked.size > 0;
  for (const c of jobCompanions) if (!exclude.has(c.sku) && !picked.has(c.sku)) picked.set(c.sku, c);
  const companions = resolveCompanions([...picked.values()]);
  if (companions.length < (fromOrders ? 1 : 2)) return null;
  const stage: BuildStage = key ? (JOBS[key] as Job).stage : "OTHER";
  return {
    title: key ? (JOBS[key] as Job).title : "Often bought with this product",
    stage,
    stageLabel: STAGES.find((s) => s.value === stage)!.label,
    companions,
    bestWith: fromOrders,
  };
}

/**
 * Best With for a whole cart: order pairings and pins for everything in it,
 * then the jobs its products belong to. Never suggests what's already in it.
 */
export function cartBestWith(cartSkus: string[], hiddenSkus: string[] = [], suggestions: BestWithSuggestion[] = [], max = 4): CompanionView[] {
  const exclude = new Set([...cartSkus, ...hiddenSkus]);
  const jobs = [...new Set(cartSkus.flatMap((sku) => {
    const product = findQuotable(sku);
    const key = product && jobKeyFor(sku, product.categorySlug);
    return key ? [key] : [];
  }))];
  const jobCompanions = jobs.flatMap((key): Companion[] => (JOBS[key] as Job).companions);
  const picked = new Map<string, Companion>();
  for (const s of suggestions) {
    if (exclude.has(s.sku) || picked.has(s.sku) || !findQuotable(s.sku)) continue;
    picked.set(s.sku, { sku: s.sku, why: suggestionWhy(s, jobCompanions.find((c) => c.sku === s.sku)), unit: jobCompanions.find((c) => c.sku === s.sku)?.unit });
  }
  for (const c of jobCompanions) if (!exclude.has(c.sku) && !picked.has(c.sku)) picked.set(c.sku, c);
  return resolveCompanions([...picked.values()]).slice(0, max);
}

/** The job key a product maps to, if any. */
export function jobKeyFor(sku: string, categorySlug: string): JobKey | null {
  if (NO_JOB.has(sku)) return null;
  return BY_SKU[sku] ?? BY_CATEGORY[categorySlug] ?? null;
}

/** Every SKU the pairings name — checked against the catalogue so a renamed product can't silently drop out. */
export const COMPANION_SKUS = [...new Set(Object.values(JOBS).flatMap((j: Job) => j.companions.map((c) => c.sku)))];
export const MAPPED_SKUS = Object.keys(BY_SKU);
