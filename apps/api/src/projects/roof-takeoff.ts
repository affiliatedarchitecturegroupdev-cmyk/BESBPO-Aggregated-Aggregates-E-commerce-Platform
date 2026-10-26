/**
 * Complete roofs (ROADMAP 11.2a, docs/projects.md): the instant take-off from a customer's brief. It gives
 * **quantities only**, worked out from the footprint, shape, pitch and covering with common South African
 * rules of thumb. They are indicative: the engineer's roof design and the truss plant's layout set the real
 * numbers, and prices come on the proposal. Pure, so it is unit-tested.
 */

export const ROOF_SHAPES = ["GABLE", "HIP", "MONO"] as const;
export type RoofShape = (typeof ROOF_SHAPES)[number];
export const ROOF_COVERINGS = ["CONCRETE_TILE", "IBR", "CORRUGATED", "CONCEALED_FIX"] as const;
export type RoofCovering = (typeof ROOF_COVERINGS)[number];

export const SHAPE_LABEL: Record<RoofShape, string> = { GABLE: "Gable (two slopes)", HIP: "Hip (four slopes)", MONO: "Mono-pitch (one slope, lean-to)" };
export const COVERING_LABEL: Record<RoofCovering, string> = {
  CONCRETE_TILE: "Concrete roof tiles",
  IBR: "IBR roof sheeting",
  CORRUGATED: "Corrugated roof sheeting",
  CONCEALED_FIX: "Concealed-fix (Klip-Lok type) sheeting",
};

export type RoofBrief = {
  shape: RoofShape;
  /** Along the ridge, wall to wall (m). */
  lengthM: number;
  /** The span, wall to wall (m). */
  widthM: number;
  pitchDeg: number;
  covering: RoofCovering;
  /** Eaves and gable overhang (m). */
  overhangM: number;
  /** Insulation over the ceiling. */
  insulation: boolean;
};

/** The usual lowest pitch for each covering. Below it the brief still goes through, with a warning; the design checks it. */
export const MIN_PITCH: Record<RoofCovering, number> = { CONCRETE_TILE: 17.5, IBR: 5, CORRUGATED: 10, CONCEALED_FIX: 3 };
/** Indicative truss centres: closer for heavy tiles, wider for sheeting. */
const TRUSS_CENTRES_M: Record<RoofCovering, number> = { CONCRETE_TILE: 0.76, IBR: 1.2, CORRUGATED: 1.2, CONCEALED_FIX: 1.2 };
/** Effective cover width of one sheet (m). */
const SHEET_COVER_M: Record<Exclude<RoofCovering, "CONCRETE_TILE">, number> = { IBR: 0.686, CORRUGATED: 0.762, CONCEALED_FIX: 0.7 };
const TILES_PER_M2 = 10.5;
const BATTEN_GAUGE_M = 0.345;
const PURLIN_CENTRES_M = 1.2;
const SCREWS_PER_M2 = 4;
const RIDGE_TILES_PER_M = 2.7;
const WASTE = 1.05;
/** One downpipe per this much gutter, and at least two. */
const GUTTER_PER_DOWNPIPE_M = 12;

export type TakeoffLine = { key: string; label: string; quantity: number; unit: string; note?: string; shopHref?: string };
export type RoofTakeoff = {
  planAreaM2: number;
  roofAreaM2: number;
  rafterLengthM: number;
  trusses: number;
  trussCentresM: number;
  lines: TakeoffLine[];
  warnings: string[];
};

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
const up = (n: number) => Math.ceil(n - 1e-9);

/** Checks a brief; returns the problem, or null. */
export function briefProblem(b: RoofBrief): string | null {
  if (!ROOF_SHAPES.includes(b.shape)) return "Choose the roof shape.";
  if (!ROOF_COVERINGS.includes(b.covering)) return "Choose the roof covering.";
  if (!(b.lengthM >= 2 && b.lengthM <= 120)) return "The length must be between 2 and 120 m.";
  if (!(b.widthM >= 2 && b.widthM <= 60)) return "The width (span) must be between 2 and 60 m.";
  if (!(b.pitchDeg >= 1 && b.pitchDeg <= 50)) return "The pitch must be between 1° and 50°.";
  if (!(b.overhangM >= 0 && b.overhangM <= 1.5)) return "The overhang must be between 0 and 1.5 m.";
  if (b.shape === "HIP" && b.lengthM < b.widthM) return "For a hip roof, give the longer side as the length.";
  return null;
}

/** The take-off for a brief (assumed valid — see briefProblem). */
export function roofTakeoff(b: RoofBrief): RoofTakeoff {
  const pitch = (b.pitchDeg * Math.PI) / 180;
  const lo = b.lengthM + 2 * b.overhangM;
  const wo = b.widthM + 2 * b.overhangM;
  const planArea = lo * wo;
  const roofArea = planArea / Math.cos(pitch);
  const run = b.shape === "MONO" ? wo : wo / 2;
  const rafter = run / Math.cos(pitch);
  const centres = TRUSS_CENTRES_M[b.covering];
  const trusses = up(b.lengthM / centres) + 1;
  const rise = run * Math.tan(pitch);
  const ridge = b.shape === "GABLE" ? lo : b.shape === "HIP" ? Math.max(lo - wo, 0) : 0;
  const hips = b.shape === "HIP" ? 4 * Math.sqrt((run * Math.SQRT2) ** 2 + rise ** 2) : 0;
  const eaves = b.shape === "GABLE" ? 2 * lo : b.shape === "HIP" ? 2 * (lo + wo) : lo;
  const verges = b.shape === "GABLE" ? 4 * rafter : b.shape === "MONO" ? 2 * rafter : 0;

  const lines: TakeoffLine[] = [
    {
      key: "trusses",
      label: `Roof trusses (${b.shape === "MONO" ? "mono-pitch" : "pitched"}, ${round(b.widthM, 2)} m span)`,
      quantity: trusses,
      unit: "trusses",
      note: `At about ${centres * 1000} mm centres${b.shape === "HIP" ? ", plus hip and jack trusses at each end" : ""} — the truss plant's layout sets the final count.`,
      shopHref: "/roofing",
    },
  ];
  if (b.covering === "CONCRETE_TILE") {
    lines.push(
      { key: "tiles", label: "Concrete roof tiles", quantity: up(roofArea * TILES_PER_M2 * WASTE), unit: "tiles", note: `About ${TILES_PER_M2} per m² plus 5% for cutting and breakage.`, shopHref: "/products?category=concrete-roof-tiles" },
      { key: "ridge-tiles", label: "Ridge and hip tiles", quantity: up((ridge + hips) * RIDGE_TILES_PER_M), unit: "tiles", shopHref: "/products?category=concrete-roof-tiles" },
      { key: "battens", label: "Tiling battens, 38 × 38 mm", quantity: up((roofArea / BATTEN_GAUGE_M) * WASTE), unit: "m", note: `At about ${BATTEN_GAUGE_M * 1000} mm gauge.`, shopHref: "/products?category=structural-timber" },
    );
  } else {
    const cover = SHEET_COVER_M[b.covering];
    lines.push(
      { key: "sheeting", label: COVERING_LABEL[b.covering], quantity: up((roofArea / cover) * WASTE), unit: "m", note: `Cut to length: runs of about ${round(rafter, 2)} m, ${cover * 1000} mm cover per sheet, plus 5%.`, shopHref: "/products?category=roof-sheeting" },
      { key: "purlins", label: "Purlins", quantity: up((roofArea / PURLIN_CENTRES_M) * WASTE), unit: "m", note: `At about ${PURLIN_CENTRES_M * 1000} mm centres — timber or steel, as the design says.`, shopHref: "/products?category=structural-timber" },
      { key: "screws", label: "Roofing screws", quantity: up(roofArea * SCREWS_PER_M2), unit: "screws", shopHref: "/products?category=roof-flashings-fixings" },
    );
    if (ridge + hips > 0) lines.push({ key: "ridge", label: "Ridge and hip cappings", quantity: round((ridge + hips) * WASTE), unit: "m", shopHref: "/products?category=roof-flashings-fixings" });
  }
  if (verges > 0) lines.push({ key: "verges", label: b.covering === "CONCRETE_TILE" ? "Barge boards / verges" : "Barge flashings", quantity: round(verges * WASTE), unit: "m", shopHref: "/products?category=roof-flashings-fixings" });
  lines.push(
    { key: "fascia", label: "Fascia boards", quantity: round(eaves * WASTE), unit: "m", shopHref: "/products?category=roof-flashings-fixings" },
    { key: "gutters", label: "Gutters", quantity: round(eaves), unit: "m", shopHref: "/products?category=roof-insulation-rainwater" },
    { key: "downpipes", label: "Downpipes", quantity: Math.max(2, up(eaves / GUTTER_PER_DOWNPIPE_M)), unit: "downpipes", shopHref: "/products?category=roof-insulation-rainwater" },
    { key: "underlay", label: "Roof underlay", quantity: up(roofArea * 1.1), unit: "m²", note: "Including laps.", shopHref: "/products?category=roof-insulation-rainwater" },
  );
  if (b.insulation) lines.push({ key: "insulation", label: "Ceiling insulation", quantity: up(b.lengthM * b.widthM), unit: "m²", note: "Thickness to the SANS 10400-XA zone for your area.", shopHref: "/products?category=roof-insulation-rainwater" });

  const warnings: string[] = [];
  if (b.pitchDeg < MIN_PITCH[b.covering]) warnings.push(`The usual minimum pitch for ${COVERING_LABEL[b.covering].replace(/^[A-Z][a-z]/, (c) => c.toLowerCase())} is ${MIN_PITCH[b.covering]}° — the design will check it, or suggest another covering.`);
  if (b.widthM > 12 && b.covering === "CONCRETE_TILE") warnings.push("Spans over 12 m usually need an engineered truss design with extra bracing — included in the roof design.");
  if (b.widthM > 25) warnings.push("Spans this wide are usually a steel structure — we can design and quote that too.");

  return { planAreaM2: round(planArea), roofAreaM2: round(roofArea), rafterLengthM: round(rafter, 2), trusses, trussCentresM: centres, lines, warnings };
}
