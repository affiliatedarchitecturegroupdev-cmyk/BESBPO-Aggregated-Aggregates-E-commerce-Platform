import { DEFAULT_ROOF_MILESTONES, milestoneAmounts, proposalProblems, proposalTotals, type ProposalLineInput } from "./proposal";

const lines: ProposalLineInput[] = [
  { kind: "DESIGN", description: "Roof design and truss layout", quantity: 1, unitPrice: 4500 },
  { kind: "MATERIALS", description: "IBR 0.47 sheeting", quantity: 189, unit: "m", unitPrice: 165.33, unitCost: 140 },
  { kind: "FABRICATION", description: "Trusses", quantity: 11, unitPrice: 1450, unitCost: 1200, partnerName: "Truss plant" },
  { kind: "INSTALLATION", description: "Erect trusses and sheet the roof", quantity: 1, unitPrice: 18500, unitCost: 15000 },
];

describe("design-and-build proposals", () => {
  it("adds up the package, and our margin where costs are known", () => {
    const t = proposalTotals(lines);
    expect(t.total).toBe(70197.37); // 4,500 + 31,247.37 + 15,950 + 18,500
    expect(t.cost).toBe(54660); // 26,460 + 13,200 + 15,000
    expect(t.margin).toBe(11037.37);
    expect(t.marginPercent).toBe(16.8);
    expect(t.allCosted).toBe(false);
  });

  it("splits the total into milestones that add up exactly", () => {
    const m = milestoneAmounts(70197.37, DEFAULT_ROOF_MILESTONES);
    expect(m.map((x) => x.amount)).toEqual([28078.95, 28078.95, 14039.47]);
    expect(m.reduce((s, x) => s + x.amount, 0)).toBeCloseTo(70197.37, 2);
  });

  it("explains what's missing before a proposal can go", () => {
    expect(proposalProblems(lines, DEFAULT_ROOF_MILESTONES)).toEqual([]);
    expect(proposalProblems([], [])).toEqual(["Add the proposal's lines.", "Add the payment milestones."]);
    expect(proposalProblems([{ ...lines[1], unitPrice: 100 }], [{ label: "All", percent: 90 }])).toEqual(["Line 1 is priced below its cost.", "The milestones add up to 90% — they must add up to 100%."]);
  });
});
