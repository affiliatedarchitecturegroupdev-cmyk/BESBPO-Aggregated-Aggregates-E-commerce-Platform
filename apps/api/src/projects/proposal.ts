/**
 * Design-and-build proposals (docs/projects.md): line totals, the package total, our margin (staff only) and the
 * milestone payment schedule. Pure, so it is unit-tested.
 */
import type { ProjectLineKind } from "@aggregates/database";

export type ProposalLineInput = { kind: ProjectLineKind; description: string; quantity: number; unit?: string | null; unitPrice: number; unitCost?: number | null; partnerName?: string | null };
export type MilestoneInput = { label: string; percent: number };

const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export const LINE_KIND_LABEL: Record<ProjectLineKind, string> = {
  DESIGN: "Design and engineering",
  MATERIALS: "Materials",
  FABRICATION: "Fabrication",
  INSTALLATION: "Installation",
  OTHER: "Other",
};

/** A complete roof's usual schedule — staff can change it per proposal. */
export const DEFAULT_ROOF_MILESTONES: MilestoneInput[] = [
  { label: "Deposit on acceptance — design, truss manufacture and materials ordered", percent: 40 },
  { label: "Trusses and materials delivered to site", percent: 40 },
  { label: "Roof complete and signed off", percent: 20 },
];

export function lineTotal(l: { quantity: number; unitPrice: number }) {
  return cents(l.quantity * l.unitPrice);
}

/** The proposal's total, and (for staff) the cost and margin where costs are known. */
export function proposalTotals(lines: ProposalLineInput[]) {
  const total = cents(lines.reduce((sum, l) => sum + lineTotal(l), 0));
  const costed = lines.filter((l) => l.unitCost !== null && l.unitCost !== undefined);
  const cost = cents(costed.reduce((sum, l) => sum + cents(l.quantity * l.unitCost!), 0));
  const costedSell = cents(costed.reduce((sum, l) => sum + lineTotal(l), 0));
  return {
    total,
    cost: costed.length ? cost : null,
    margin: costed.length ? cents(costedSell - cost) : null,
    marginPercent: costed.length && costedSell > 0 ? cents(((costedSell - cost) / costedSell) * 100) : null,
    allCosted: costed.length === lines.length,
  };
}

/** Problems with a proposal, in plain words; empty when it can be sent. */
export function proposalProblems(lines: ProposalLineInput[], milestones: MilestoneInput[]): string[] {
  const problems: string[] = [];
  if (!lines.length) problems.push("Add the proposal's lines.");
  lines.forEach((l, i) => {
    if (!l.description.trim()) problems.push(`Line ${i + 1} needs a description.`);
    if (!(l.quantity > 0)) problems.push(`Line ${i + 1} needs a quantity.`);
    if (!(l.unitPrice >= 0)) problems.push(`Line ${i + 1} needs a price.`);
    if (l.unitCost !== null && l.unitCost !== undefined && l.unitPrice < l.unitCost) problems.push(`Line ${i + 1} is priced below its cost.`);
  });
  if (!milestones.length) problems.push("Add the payment milestones.");
  if (milestones.some((m) => !(m.percent > 0) || !m.label.trim())) problems.push("Each milestone needs a description and a share above 0%.");
  const sum = cents(milestones.reduce((s, m) => s + m.percent, 0));
  if (milestones.length && sum !== 100) problems.push(`The milestones add up to ${sum}% — they must add up to 100%.`);
  if (lines.length && proposalTotals(lines).total <= 0) problems.push("The proposal's total must be more than R0.");
  return problems;
}

/** Each milestone's amount, to the cent; the last takes the rounding so they add up to the total exactly. */
export function milestoneAmounts(total: number, milestones: MilestoneInput[]) {
  let left = total;
  return milestones.map((m, i) => {
    const amount = i === milestones.length - 1 ? cents(left) : cents((total * m.percent) / 100);
    left = cents(left - amount);
    return { sequence: i + 1, label: m.label.trim(), percent: m.percent, amount };
  });
}
