/**
 * Steel structures (ROADMAP 11.2b, docs/projects.md): the instant take-off for a portal-frame building — a
 * warehouse or workshop (clad), or an open carport, shade or canopy. **Quantities only**, from common rules of
 * thumb: the engineer's design sets the steel sections, their mass, the bracing and the foundations, and prices
 * come on the proposal. Pure, so it is unit-tested.
 */
import type { TakeoffFigure, TakeoffLine } from "./roof-takeoff";

export const STEEL_USES = ["WAREHOUSE", "WORKSHOP", "CARPORT", "CANOPY"] as const;
export type SteelUse = (typeof STEEL_USES)[number];
export const STEEL_ROOFS = ["DUO", "MONO"] as const;
export type SteelRoof = (typeof STEEL_ROOFS)[number];
export const STEEL_SHEETS = ["IBR", "CORRUGATED", "CONCEALED_FIX"] as const;
export type SteelSheet = (typeof STEEL_SHEETS)[number];

export const USE_LABEL: Record<SteelUse, string> = { WAREHOUSE: "Warehouse", WORKSHOP: "Workshop", CARPORT: "Carport or shade structure", CANOPY: "Canopy" };
export const SHEET_LABEL: Record<SteelSheet, string> = { IBR: "IBR sheeting", CORRUGATED: "corrugated sheeting", CONCEALED_FIX: "concealed-fix sheeting" };

export type SteelBrief = {
  use: SteelUse;
  roof: SteelRoof;
  lengthM: number;
  spanM: number;
  /** Underside of the roof at the eaves (m); the low side of a mono-pitch. */
  eavesHeightM: number;
  pitchDeg: number;
  /** Roof and wall sheeting. */
  sheeting: SteelSheet;
  /** Clad walls all round (warehouses and workshops). */
  enclosed: boolean;
  /** Roller shutter doors, in the clad walls. */
  rollerDoors: number;
  insulation: boolean;
  /** A concrete floor slab inside. */
  floorSlab: boolean;
};

/** Indicative portal-frame bay (centres of the frames). */
const BAY_M = 6;
const PURLIN_CENTRES_M = 1.5;
const GIRT_CENTRES_M = 1.5;
const COVER_M: Record<SteelSheet, number> = { IBR: 0.686, CORRUGATED: 0.762, CONCEALED_FIX: 0.7 };
const MIN_PITCH: Record<SteelSheet, number> = { IBR: 5, CORRUGATED: 10, CONCEALED_FIX: 3 };
const ROLLER_DOOR_M2 = 16; // 4 × 4 m
const SCREWS_PER_M2 = 4;
const BOLTS_PER_COLUMN = 4;
const SLAB_M = 0.15;
const WASTE = 1.05;
const GUTTER_PER_DOWNPIPE_M = 12;

export type SteelTakeoff = { frames: number; bayM: number; roofAreaM2: number; floorAreaM2: number; figures: TakeoffFigure[]; lines: TakeoffLine[]; warnings: string[] };

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;
const up = (n: number) => Math.ceil(n - 1e-9);

export function steelBriefProblem(b: SteelBrief): string | null {
  if (!STEEL_USES.includes(b.use)) return "Choose what the structure is for.";
  if (!STEEL_ROOFS.includes(b.roof)) return "Choose the roof shape.";
  if (!STEEL_SHEETS.includes(b.sheeting)) return "Choose the sheeting.";
  if (!(b.lengthM >= 3 && b.lengthM <= 200)) return "The length must be between 3 and 200 m.";
  if (!(b.spanM >= 3 && b.spanM <= 60)) return "The span must be between 3 and 60 m.";
  if (!(b.eavesHeightM >= 2 && b.eavesHeightM <= 15)) return "The eaves height must be between 2 and 15 m.";
  if (!(b.pitchDeg >= 1 && b.pitchDeg <= 30)) return "The roof pitch must be between 1° and 30°.";
  if (!(Number.isInteger(b.rollerDoors) && b.rollerDoors >= 0 && b.rollerDoors <= 20)) return "Roller doors: a whole number from 0 to 20.";
  if (b.rollerDoors > 0 && !b.enclosed) return "Roller doors go in clad walls — choose clad walls, or no doors.";
  return null;
}

export function steelTakeoff(b: SteelBrief): SteelTakeoff {
  const pitch = (b.pitchDeg * Math.PI) / 180;
  const bays = Math.max(1, up(b.lengthM / BAY_M));
  const frames = bays + 1;
  const bay = b.lengthM / bays;
  const slopes = b.roof === "DUO" ? 2 : 1;
  const run = b.roof === "DUO" ? b.spanM / 2 : b.spanM;
  const rafter = run / Math.cos(pitch);
  const rise = run * Math.tan(pitch);
  const roofArea = b.lengthM * b.spanM / Math.cos(pitch);
  const floorArea = b.lengthM * b.spanM;
  const columns = frames * 2;
  const columnLm = frames * (b.roof === "DUO" ? 2 * b.eavesHeightM : 2 * b.eavesHeightM + rise);
  const purlinRows = slopes * (up(rafter / PURLIN_CENTRES_M) + 1);
  const perimeter = 2 * (b.lengthM + b.spanM);
  // Walls: the perimeter to the eaves, plus the gable triangles (or the mono-pitch's high-side strip and end triangles).
  const gables = b.roof === "DUO" ? b.spanM * rise : b.spanM * rise + b.lengthM * rise;
  const wallArea = b.enclosed ? Math.max(0, perimeter * b.eavesHeightM + gables - b.rollerDoors * ROLLER_DOOR_M2) : 0;
  const eaves = slopes * b.lengthM;

  const lines: TakeoffLine[] = [
    { key: "frames", kind: "FABRICATION", label: `Portal frames (${b.roof === "DUO" ? "duo-pitch" : "mono-pitch"}, ${round(b.spanM, 2)} m span)`, quantity: frames, unit: "frames", note: `About ${round(bay, 2)} m bays — the engineer sizes the columns and rafters.` },
    { key: "columns", kind: "FABRICATION", label: "Columns", quantity: round(columnLm), unit: "m", note: `${columns} columns.` },
    { key: "rafters", kind: "FABRICATION", label: "Rafters", quantity: round(frames * slopes * rafter), unit: "m" },
    { key: "purlins", kind: "MATERIALS", label: "Roof purlins (lipped channel)", quantity: up(purlinRows * b.lengthM * WASTE), unit: "m", note: `At about ${PURLIN_CENTRES_M * 1000} mm centres.`, shopHref: "/products?category=structural-steel" },
  ];
  if (b.enclosed) lines.push({ key: "girts", kind: "MATERIALS", label: "Wall girts (side rails)", quantity: up((up(b.eavesHeightM / GIRT_CENTRES_M) * perimeter) * WASTE), unit: "m", shopHref: "/products?category=structural-steel" });
  lines.push(
    { key: "bracing", kind: "FABRICATION", label: "Roof and wall bracing, base plates and connections", quantity: 1, unit: "lot", note: "As the engineer's design details them." },
    { key: "bolts", kind: "MATERIALS", label: "Holding-down bolts", quantity: columns * BOLTS_PER_COLUMN, unit: "bolts", shopHref: "/products?category=structural-steel" },
    { key: "footings", kind: "MATERIALS", label: "Column footings", quantity: columns, unit: "footings", note: "Sized by the engineer from the site's soil.", shopHref: "/ready-mix" },
    { key: "roof-sheeting", kind: "MATERIALS", label: `Roof ${SHEET_LABEL[b.sheeting]}`, quantity: up((roofArea / COVER_M[b.sheeting]) * WASTE), unit: "m", note: `Cut to length: runs of about ${round(rafter, 2)} m.`, shopHref: "/products?category=roof-sheeting" },
  );
  if (b.enclosed) lines.push({ key: "wall-sheeting", kind: "MATERIALS", label: `Wall ${SHEET_LABEL[b.sheeting]}`, quantity: up(wallArea * WASTE), unit: "m²", shopHref: "/products?category=roof-sheeting" });
  lines.push({ key: "screws", kind: "MATERIALS", label: "Sheeting screws", quantity: up((roofArea + wallArea) * SCREWS_PER_M2), unit: "screws", shopHref: "/products?category=roof-flashings-fixings" });
  if (b.roof === "DUO") lines.push({ key: "ridge", kind: "MATERIALS", label: "Ridge capping", quantity: round(b.lengthM * WASTE), unit: "m", shopHref: "/products?category=roof-flashings-fixings" });
  lines.push(
    { key: "flashings", kind: "MATERIALS", label: b.enclosed ? "Corner, barge and door flashings" : "Barge flashings", quantity: round((4 * rafter * (b.roof === "DUO" ? 1 : 0.5) + (b.enclosed ? 4 * b.eavesHeightM + b.rollerDoors * 12 : 0)) * WASTE), unit: "m", shopHref: "/products?category=roof-flashings-fixings" },
    { key: "gutters", kind: "MATERIALS", label: "Gutters", quantity: round(eaves), unit: "m", shopHref: "/products?category=roof-insulation-rainwater" },
    { key: "downpipes", kind: "MATERIALS", label: "Downpipes", quantity: Math.max(slopes * 2, up(eaves / GUTTER_PER_DOWNPIPE_M)), unit: "downpipes", shopHref: "/products?category=roof-insulation-rainwater" },
  );
  if (b.rollerDoors > 0) lines.push({ key: "doors", kind: "MATERIALS", label: "Roller shutter doors, about 4 × 4 m", quantity: b.rollerDoors, unit: "doors", shopHref: "/doors-windows" });
  if (b.insulation) lines.push({ key: "insulation", kind: "MATERIALS", label: "Roof insulation", quantity: up(roofArea), unit: "m²", shopHref: "/products?category=roof-insulation-rainwater" });
  if (b.floorSlab) lines.push({ key: "slab", kind: "MATERIALS", label: "Floor slab concrete (about 150 mm)", quantity: round(floorArea * SLAB_M * WASTE), unit: "m³", note: "The engineer sets the thickness, mesh and joints.", shopHref: "/ready-mix" });

  const warnings: string[] = ["Open-sided and tall structures are designed for the wind at your site — the engineer's design includes the bracing."];
  if (b.pitchDeg < MIN_PITCH[b.sheeting]) warnings.push(`The usual minimum pitch for ${SHEET_LABEL[b.sheeting]} is ${MIN_PITCH[b.sheeting]}° — the design will check it, or suggest another sheet.`);
  if (b.spanM > 30) warnings.push("Spans over 30 m usually need deeper sections, trusses or internal columns — the design decides.");
  if (b.eavesHeightM > 8) warnings.push("Eaves above 8 m usually need heavier columns and crane-access erection.");

  return {
    frames,
    bayM: round(bay, 2),
    roofAreaM2: round(roofArea),
    floorAreaM2: round(floorArea),
    figures: [
      { label: "Floor area", value: round(floorArea), unit: "m²" },
      { label: "Roof area", value: round(roofArea), unit: "m²" },
      { label: "Frames", value: frames, unit: `at ${round(bay, 2)} m` },
      { label: "Wall cladding", value: round(wallArea), unit: "m²" },
    ],
    lines,
    warnings,
  };
}
