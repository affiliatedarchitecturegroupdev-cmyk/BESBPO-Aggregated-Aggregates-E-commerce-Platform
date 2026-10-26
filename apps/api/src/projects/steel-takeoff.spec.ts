import { steelBriefProblem, steelTakeoff, type SteelBrief } from "./steel-takeoff";

const warehouse: SteelBrief = { use: "WAREHOUSE", roof: "DUO", lengthM: 30, spanM: 15, eavesHeightM: 6, pitchDeg: 6, sheeting: "IBR", enclosed: true, rollerDoors: 2, insulation: false, floorSlab: true };

describe("steel structures: the take-off", () => {
  it("works out a clad duo-pitch warehouse", () => {
    const t = steelTakeoff(warehouse);
    expect(t.frames).toBe(6); // 30 m in five 6 m bays
    expect(t.floorAreaM2).toBe(450);
    expect(t.roofAreaM2).toBe(452.5); // ÷ cos 6°
    const q = Object.fromEntries(t.lines.map((l) => [l.key, l.quantity]));
    expect(q.columns).toBe(72); // 12 columns × 6 m
    expect(q.rafters).toBe(90.5); // 6 frames × 2 × 7.54 m
    expect(q.bolts).toBe(48);
    expect(q.doors).toBe(2);
    expect(q.slab).toBe(70.9); // 450 m² × 0.15 m × 1.05
    expect(q["wall-sheeting"]).toBeGreaterThan(500);
    expect(t.lines.find((l) => l.key === "frames")!.kind).toBe("FABRICATION");
    expect(t.figures.map((f) => f.label)).toEqual(["Floor area", "Roof area", "Frames", "Wall cladding"]);
  });

  it("leaves out walls, girts and doors on an open mono-pitch carport", () => {
    const t = steelTakeoff({ ...warehouse, use: "CARPORT", roof: "MONO", lengthM: 12, spanM: 6, eavesHeightM: 2.4, enclosed: false, rollerDoors: 0, floorSlab: false });
    const keys = t.lines.map((l) => l.key);
    expect(keys).not.toEqual(expect.arrayContaining(["girts"]));
    expect(keys).not.toContain("wall-sheeting");
    expect(keys).not.toContain("ridge");
    expect(t.frames).toBe(3);
    expect(t.figures.find((f) => f.label === "Wall cladding")!.value).toBe(0);
  });

  it("warns and refuses where it should", () => {
    expect(steelTakeoff({ ...warehouse, spanM: 36, pitchDeg: 3 }).warnings.join(" ")).toMatch(/minimum pitch for IBR sheeting is 5°.*Spans over 30 m/);
    expect(steelBriefProblem(warehouse)).toBeNull();
    expect(steelBriefProblem({ ...warehouse, enclosed: false })).toMatch(/Roller doors go in clad walls/);
    expect(steelBriefProblem({ ...warehouse, eavesHeightM: 20 })).toMatch(/eaves height/);
  });
});
