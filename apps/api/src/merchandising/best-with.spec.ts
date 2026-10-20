import { byStrength, scoreAffinities } from "./best-with";

describe("Best With scores", () => {
  // 10 orders: bricks + sand in 4, bricks + sand + cement in 2, bricks alone in 2, a big one-off pair once.
  const orders = [
    ...Array(4).fill(["bricks", "sand"]),
    ...Array(2).fill(["bricks", "sand", "cement", "cement"]),
    ["bricks"],
    ["bricks"],
    ["tiles", "grout"],
    ["sand"],
  ];

  it("counts a pairing once it's in enough different orders, with confidence and lift", () => {
    const rows = scoreAffinities(orders, 3);
    const bricksSand = rows.find((r) => r.productId === "bricks" && r.pairedProductId === "sand")!;
    // 6 of the 8 brick orders had sand; sand is in 7 of 10 orders.
    expect(bricksSand).toEqual({ productId: "bricks", pairedProductId: "sand", orders: 6, confidence: 0.75, lift: 1.0714 });
    expect(rows.find((r) => r.productId === "sand" && r.pairedProductId === "bricks")!.confidence).toBeCloseTo(6 / 7, 4);
    // Seen in only 2 or 1 orders: not counted.
    expect(rows.some((r) => r.pairedProductId === "cement" || r.productId === "tiles")).toBe(false);
    expect(scoreAffinities(orders, 2).some((r) => r.productId === "cement" && r.pairedProductId === "bricks")).toBe(true);
  });

  it("keeps the strongest pairings per product, strongest first", () => {
    const many = Array.from({ length: 5 }, () => ["a", "b", "c", "d"]).concat(Array.from({ length: 3 }, () => ["a", "b"]));
    const rows = scoreAffinities(many, 3, 2).filter((r) => r.productId === "a");
    expect(rows.map((r) => r.pairedProductId)).toEqual(["b", "c"]);
    expect([...rows].sort(byStrength)).toEqual(rows);
  });

  it("returns nothing without orders", () => {
    expect(scoreAffinities([])).toEqual([]);
  });
});
