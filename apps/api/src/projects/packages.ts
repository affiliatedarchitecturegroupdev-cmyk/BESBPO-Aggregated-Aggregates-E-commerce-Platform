/**
 * The design-and-build packages the project engine sells (docs/projects.md). Each has a brief, an instant
 * take-off and a usual payment schedule. Complete roofs first (ROADMAP 11.2a); steel structures next.
 */
import type { ProjectPackage } from "@aggregates/database";
import { DEFAULT_ROOF_MILESTONES, type MilestoneInput } from "./proposal";
import { briefProblem, roofTakeoff, ROOF_COVERINGS, ROOF_SHAPES, type RoofBrief, type RoofTakeoff } from "./roof-takeoff";

export const PACKAGE_LABEL: Record<ProjectPackage, string> = { ROOF: "Complete roof" };
export const PACKAGE_MILESTONES: Record<ProjectPackage, MilestoneInput[]> = { ROOF: DEFAULT_ROOF_MILESTONES };

const SHAPE_WORD: Record<RoofBrief["shape"], string> = { GABLE: "Gable", HIP: "Hip", MONO: "Mono-pitch" };
const COVERING_WORDS: Record<RoofBrief["covering"], string> = { CONCRETE_TILE: "concrete roof tiles", IBR: "IBR sheeting", CORRUGATED: "corrugated sheeting", CONCEALED_FIX: "concealed-fix sheeting" };

/** A brief as received: numbers from strings, defaults filled, unknown fields dropped. */
export function readRoofBrief(input: Record<string, unknown>): RoofBrief {
  const num = (v: unknown, fallback: number) => (v === undefined || v === null || v === "" ? fallback : Number(v));
  return {
    shape: (ROOF_SHAPES as readonly string[]).includes(String(input.shape)) ? (input.shape as RoofBrief["shape"]) : ("?" as never),
    covering: (ROOF_COVERINGS as readonly string[]).includes(String(input.covering)) ? (input.covering as RoofBrief["covering"]) : ("?" as never),
    lengthM: num(input.lengthM, NaN),
    widthM: num(input.widthM, NaN),
    pitchDeg: num(input.pitchDeg, input.covering === "CONCRETE_TILE" ? 26 : 10),
    overhangM: num(input.overhangM, 0.6),
    insulation: input.insulation === true || input.insulation === "true",
  };
}

/** The take-off for a package's brief, or the reason the brief can't be worked out. */
export function takeoffFor(pkg: ProjectPackage, input: Record<string, unknown>): { brief: RoofBrief; takeoff: RoofTakeoff } | { problem: string } {
  const brief = readRoofBrief(input);
  const problem = briefProblem(brief);
  return problem ? { problem } : { brief, takeoff: roofTakeoff(brief) };
}

/** One line about a project, e.g. "Gable roof, 12 × 8 m, concrete roof tiles". */
export function projectSummary(pkg: ProjectPackage, brief: unknown): string {
  const b = brief as Partial<RoofBrief>;
  if (pkg === "ROOF" && b.shape && b.covering) return `${SHAPE_WORD[b.shape]} roof, ${b.lengthM} × ${b.widthM} m, ${COVERING_WORDS[b.covering]}`;
  return PACKAGE_LABEL[pkg];
}
