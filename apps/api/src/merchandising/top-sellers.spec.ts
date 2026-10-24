import { rank } from "./top-sellers.service";

describe("top sellers", () => {
  it("ranks by orders containing the product, then by quantity, counting a product once per order", () => {
    // SAND is in 3 orders, CEMENT in 2 (more units, but fewer orders), STONE and REBAR in 1 each — STONE has more units.
    const orders = [
      [{ sku: "SAND", quantity: 10 }, { sku: "CEMENT", quantity: 20 }, { sku: "SAND", quantity: 5 }],
      [{ sku: "CEMENT", quantity: 2 }, { sku: "SAND", quantity: 1 }],
      [{ sku: "STONE", quantity: 30 }, { sku: "SAND", quantity: 1 }],
      [{ sku: "REBAR", quantity: 1 }],
    ];
    expect(rank(orders)).toEqual(["SAND", "CEMENT", "STONE", "REBAR"]);
  });

  it("is empty with no orders", () => {
    expect(rank([])).toEqual([]);
  });
});
