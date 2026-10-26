import { briefProblem, roofTakeoff, type RoofBrief } from "./roof-takeoff";

const house: RoofBrief = { shape: "GABLE", lengthM: 12, widthM: 8, pitchDeg: 26, covering: "CONCRETE_TILE", overhangM: 0.6, insulation: true };

describe("complete roofs: the take-off", () => {
  it("works out a tiled gable roof", () => {
    const t = roofTakeoff(house);
    expect(t.planAreaM2).toBe(121.4); // 13.2 × 9.2 m with the overhang
    expect(t.roofAreaM2).toBe(135.1); // ÷ cos 26°
    expect(t.rafterLengthM).toBe(5.12);
    expect(t.trusses).toBe(17); // 12 m at 760 mm centres
    const q = Object.fromEntries(t.lines.map((l) => [l.key, l.quantity]));
    expect(q.tiles).toBe(1490); // 135.1 m² × 10.5 × 1.05
    expect(q.battens).toBe(412);
    expect(q.gutters).toBe(26.4);
    expect(q.downpipes).toBe(3);
    expect(q.insulation).toBe(96);
    expect(t.lines.some((l) => l.key === "sheeting")).toBe(false);
    expect(t.warnings).toEqual([]);
  });

  it("works out sheeting, hip and mono-pitch roofs", () => {
    const ibr = roofTakeoff({ ...house, covering: "IBR", pitchDeg: 10, insulation: false });
    expect(ibr.trusses).toBe(11); // 1.2 m centres
    const q = Object.fromEntries(ibr.lines.map((l) => [l.key, l.quantity]));
    expect(q.sheeting).toBe(189); // 123.3 m² ÷ 0.686 m cover × 1.05
    expect(q.ridge).toBe(13.9);
    expect(ibr.lines.find((l) => l.key === "insulation")).toBeUndefined();
    const hip = roofTakeoff({ ...house, shape: "HIP" });
    expect(hip.lines.find((l) => l.key === "verges")).toBeUndefined();
    expect(hip.lines.find((l) => l.key === "gutters")!.quantity).toBe(44.8); // all round
    const mono = roofTakeoff({ ...house, shape: "MONO", covering: "IBR", pitchDeg: 5 });
    expect(mono.rafterLengthM).toBe(9.24);
    expect(mono.lines.find((l) => l.key === "ridge")).toBeUndefined();
  });

  it("warns about a low pitch and wide spans, and refuses impossible briefs", () => {
    expect(roofTakeoff({ ...house, pitchDeg: 15 }).warnings[0]).toMatch(/minimum pitch for concrete roof tiles is 17.5°/);
    expect(roofTakeoff({ ...house, widthM: 30, lengthM: 40, covering: "IBR", pitchDeg: 6 }).warnings.join(" ")).toMatch(/steel structure/);
    expect(briefProblem(house)).toBeNull();
    expect(briefProblem({ ...house, lengthM: 1 })).toMatch(/length/);
    expect(briefProblem({ ...house, shape: "HIP", lengthM: 6 })).toMatch(/longer side/);
    expect(briefProblem({ ...house, covering: "THATCH" as never })).toMatch(/covering/);
  });
});
