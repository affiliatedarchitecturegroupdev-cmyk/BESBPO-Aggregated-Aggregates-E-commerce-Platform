import { assessDdp, DEFAULT_DDP_POLICY, normaliseDdpPolicy, originFee, supplyPoints, type DdpLine } from "./ddp";

const line = (productId: string, categorySlug: string, group: string, tons: number): DdpLine => ({ productId, categorySlug, group, tons });
const sand = line("sand", "sand-fine-aggregates", "core", 6);
const stone = line("stone", "crushed-stone", "core", 10);
const cement = line("cement", "cement-hydraulic-binders", "b2b-bulk", 1);
const bricks = line("bricks", "bricks-blocks", "masonry", 2.6);
const sheets = line("sheets", "roof-sheeting", "roofing", 0.4);
const taps = line("taps", "taps-mixers-valves", "supplies", 0.01);
const tiles = line("tiles", "floor-wall-tiles", "supplies", 0.5);
const mix = line("mix", "ready-mix-concrete", "ready-mix", 0);

describe("Distributed Delivery Premium", () => {
  it("prices supply points the owner's way: R0, R200, R450, then R225 each", () => {
    expect([1, 2, 3, 4, 5].map((n) => originFee(n, DEFAULT_DDP_POLICY))).toEqual([0, 200, 450, 675, 900]);
  });

  it("Tier 1: three products from one kind of supplier pay nothing", () => {
    const r = assessDdp([sand, stone, line("dust", "crushed-stone", "core", 3)], []);
    expect(r).toMatchObject({ applies: false, fee: 0, tier: "CONSOLIDATED", products: 3 });
    expect(r.origins).toHaveLength(1);
  });

  it("needs 3 different products: two products from two places pay nothing", () => {
    expect(assessDdp([sand, taps], [])).toMatchObject({ applies: false, fee: 0, tier: "DUAL_ORIGIN" });
  });

  it("Tier 2: the heaviest point is covered; the other pays R200 plus R150 a ton of heavy goods", () => {
    // Sand + stone (16 t) from the quarry; cement (1 t) from a second point.
    const r = assessDdp([sand, stone, cement], []);
    expect(r).toMatchObject({ applies: true, tier: "DUAL_ORIGIN", originFee: 200, extraHeavyTons: 1, weightFee: 150, fee: 350 });
    expect(r.origins[0].label).toBe("Quarry (aggregates & sand)");
  });

  it("Tier 3: roofing, bricks and plumbing from three points — R450 plus the heavy tons after the main point, rounded up", () => {
    // Bricks (2.6 t) are the main point; roofing 0.4 t is heavy (part of a ton = 1), taps are light.
    const r = assessDdp([sheets, bricks, taps], []);
    expect(r).toMatchObject({ applies: true, tier: "DISTRIBUTED", originFee: 450, extraHeavyTons: 0.4, weightFee: 150, fee: 600 });
    expect(r.summary).toMatch(/3 supply points/);
  });

  it("light goods and ready-mix add supply points but no weight charge", () => {
    const r = assessDdp([sand, taps, tiles, mix], []);
    expect(r).toMatchObject({ originFee: 450, weightFee: 0, fee: 450 });
  });

  it("a partner supplier within reach that stocks several categories consolidates them", () => {
    const merchant = { id: "m1", categorySlugs: ["sand-fine-aggregates", "cement-hydraulic-binders", "bricks-blocks"], distanceKm: 12 };
    const r = assessDdp([sand, cement, bricks], [merchant]);
    expect(r).toMatchObject({ applies: false, fee: 0, tier: "CONSOLIDATED" });
    // Partly covered: the merchant has sand and cement, taps come from elsewhere.
    const partial = assessDdp([sand, cement, taps], [{ id: "m2", categorySlugs: ["sand-fine-aggregates", "cement-hydraulic-binders"] }]);
    expect(partial).toMatchObject({ tier: "DUAL_ORIGIN", originFee: 200, weightFee: 0 });
    expect(partial.origins.map((o) => o.label)).toEqual(["Quarry (aggregates & sand) + Cement & binders", "Building supplies"]);
  });

  it("never counts more supply points than kinds of supplier, whatever the suppliers", () => {
    const tiny = ["sand-fine-aggregates", "crushed-stone"].map((c, i) => ({ id: `s${i}`, categorySlugs: [c] }));
    expect(supplyPoints([sand, stone, cement], tiny)).toHaveLength(2);
  });

  it("respects the admin's switch and keeps edited rates sensible", () => {
    expect(assessDdp([sand, stone, cement], [], { ...DEFAULT_DDP_POLICY, enabled: false })).toMatchObject({ applies: false, fee: 0 });
    expect(normaliseDdpPolicy({ twoOriginFee: -5, minProducts: 1, heavyPerTon: 99.999 })).toMatchObject({ twoOriginFee: 200, minProducts: 2, heavyPerTon: 100 });
    expect(normaliseDdpPolicy(null)).toEqual(DEFAULT_DDP_POLICY);
  });
});
