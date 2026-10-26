/**
 * The design-and-build packages the project engine sells (docs/projects.md). Each has a brief, an instant
 * take-off (quantities only), a usual payment schedule and a starting point for the proposal. Complete roofs
 * (ROADMAP 11.2a) and steel structures (11.2b).
 */
import type { ProjectLineKind, ProjectPackage } from "@aggregates/database";
import { DEFAULT_ROOF_MILESTONES, DEFAULT_STEEL_MILESTONES, type MilestoneInput } from "./proposal";
import { briefProblem, roofTakeoff, ROOF_COVERINGS, ROOF_SHAPES, type RoofBrief, type TakeoffFigure, type TakeoffLine } from "./roof-takeoff";
import { SHEET_LABEL, steelBriefProblem, steelTakeoff, STEEL_ROOFS, STEEL_SHEETS, STEEL_USES, USE_LABEL, type SteelBrief } from "./steel-takeoff";

export const PACKAGE_LABEL: Record<ProjectPackage, string> = { ROOF: "Complete roof", STEEL_STRUCTURE: "Steel structure" };
export const PACKAGE_MILESTONES: Record<ProjectPackage, MilestoneInput[]> = { ROOF: DEFAULT_ROOF_MILESTONES, STEEL_STRUCTURE: DEFAULT_STEEL_MILESTONES };

/** What every package's take-off has in common: the summary panel's figures, the items and any warnings. */
export type Takeoff = { figures: TakeoffFigure[]; lines: TakeoffLine[]; warnings: string[] };
type Brief = RoofBrief | SteelBrief;

const SHAPE_WORD: Record<RoofBrief["shape"], string> = { GABLE: "Gable", HIP: "Hip", MONO: "Mono-pitch" };
const COVERING_WORDS: Record<RoofBrief["covering"], string> = { CONCRETE_TILE: "concrete roof tiles", IBR: "IBR sheeting", CORRUGATED: "corrugated sheeting", CONCEALED_FIX: "concealed-fix sheeting" };

const num = (v: unknown, fallback: number) => (v === undefined || v === null || v === "" ? fallback : Number(v));
const flag = (v: unknown) => v === true || v === "true";
const pick = <T extends string>(options: readonly T[], v: unknown): T => (options.includes(String(v) as T) ? (v as T) : ("?" as T));

/** A roof brief as received: numbers from strings, defaults filled, unknown fields dropped. */
export function readRoofBrief(input: Record<string, unknown>): RoofBrief {
  return {
    shape: pick(ROOF_SHAPES, input.shape),
    covering: pick(ROOF_COVERINGS, input.covering),
    lengthM: num(input.lengthM, NaN),
    widthM: num(input.widthM, NaN),
    pitchDeg: num(input.pitchDeg, input.covering === "CONCRETE_TILE" ? 26 : 10),
    overhangM: num(input.overhangM, 0.6),
    insulation: flag(input.insulation),
  };
}

export function readSteelBrief(input: Record<string, unknown>): SteelBrief {
  const use = pick(STEEL_USES, input.use);
  return {
    use,
    roof: pick(STEEL_ROOFS, input.roof),
    sheeting: pick(STEEL_SHEETS, input.sheeting),
    lengthM: num(input.lengthM, NaN),
    spanM: num(input.spanM, NaN),
    eavesHeightM: num(input.eavesHeightM, NaN),
    pitchDeg: num(input.pitchDeg, 6),
    enclosed: input.enclosed === undefined ? use === "WAREHOUSE" || use === "WORKSHOP" : flag(input.enclosed),
    rollerDoors: num(input.rollerDoors, 0),
    insulation: flag(input.insulation),
    floorSlab: flag(input.floorSlab),
  };
}

/** The take-off for a package's brief, or the reason the brief can't be worked out. */
export function takeoffFor(pkg: ProjectPackage, input: Record<string, unknown>): { brief: Brief; takeoff: Takeoff } | { problem: string } {
  if (pkg === "STEEL_STRUCTURE") {
    const brief = readSteelBrief(input);
    const problem = steelBriefProblem(brief);
    return problem ? { problem } : { brief, takeoff: steelTakeoff(brief) };
  }
  const brief = readRoofBrief(input);
  const problem = briefProblem(brief);
  return problem ? { problem } : { brief, takeoff: roofTakeoff(brief) };
}

/** One line about a project, e.g. "Gable roof, 12 × 8 m, concrete roof tiles" or "Warehouse, 30 × 15 m, 6 m eaves, clad". */
export function projectSummary(pkg: ProjectPackage, brief: unknown): string {
  if (pkg === "STEEL_STRUCTURE") {
    const b = brief as Partial<SteelBrief>;
    if (b.use && b.sheeting) return `${USE_LABEL[b.use]}, ${b.lengthM} × ${b.spanM} m, ${b.eavesHeightM} m eaves, ${b.enclosed ? `clad in ${SHEET_LABEL[b.sheeting]}` : `open, ${SHEET_LABEL[b.sheeting]} roof`}`;
    return PACKAGE_LABEL[pkg];
  }
  const b = brief as Partial<RoofBrief>;
  if (b.shape && b.covering) return `${SHAPE_WORD[b.shape]} roof, ${b.lengthM} × ${b.widthM} m, ${COVERING_WORDS[b.covering]}`;
  return PACKAGE_LABEL[pkg];
}

/**
 * The proposal editor's starting point: design, then every take-off item (partner-made ones as fabrication),
 * then installation — each for staff to price from the catalogue and the partners' quotes.
 */
export function suggestedLines(pkg: ProjectPackage, takeoff: Takeoff): { kind: ProjectLineKind; description: string; quantity: number; unit: string | null }[] {
  const design = pkg === "STEEL_STRUCTURE" ? "Structural steel design, shop drawings and engineer's sign-off" : "Roof design, truss layout and engineer's sign-off";
  const install = pkg === "STEEL_STRUCTURE" ? "Erect the steel, sheet the roof and walls, fit doors and gutters" : "Erect trusses and cover the roof";
  return [
    { kind: "DESIGN", description: design, quantity: 1, unit: null },
    ...takeoff.lines.map((l) => ({ kind: (l.kind ?? "MATERIALS") as ProjectLineKind, description: l.label, quantity: l.quantity, unit: l.unit })),
    { kind: "INSTALLATION", description: install, quantity: 1, unit: null },
  ];
}
