import { readFileSync } from "fs";
import { join } from "path";
import { csvRows } from "../boq/boq";
import { checkRows, importRows, makeSku, makeSlug, parseUnits } from "./catalogue-import";

const CATEGORIES = [
  { slug: "garden-tools-irrigation", name: "Garden Tools & Irrigation", catalogueGroup: "supplies" },
  { slug: "structural-steel", name: "Structural Steel", catalogueGroup: "steel" },
  { slug: "crushed-stone", name: "Crushed Stone", catalogueGroup: "core" },
];
const EXISTING = [{ sku: "AA-GTI-HOSE-20", slug: "garden-hose-20-m", name: "Garden hose 20 m", categorySlug: "garden-tools-irrigation" }];

const check = (rows: string[][]) => {
  const read = importRows(rows);
  return checkRows(read.rows, CATEGORIES, EXISTING, new Set(["AA-GTI-HOSE-20"]), new Set(["garden-hose-20-m"]));
};

describe("catalogue import", () => {
  it("finds the columns under a title row, in any order and spelling", () => {
    const { rows, problem } = importRows([
      ["Shade Co range, November"],
      ["Product name", "UOM", "Category", "Brand", "Supplier code", "Nett price"],
      ["Shade net 80% 3 × 50 m", "roll", "Garden Tools & Irrigation", "Alnet", "SN-80-3", "R 1 000,00"],
      ["", "", "", "", "", ""],
    ]);
    expect(problem).toBeNull();
    expect(rows).toEqual([
      expect.objectContaining({ rowNumber: 3, name: "Shade net 80% 3 × 50 m", category: "Garden Tools & Irrigation", unitText: "roll", brand: "Alnet", supplierCode: "SN-80-3", costText: "R 1 000,00", sku: null }),
    ]);
    expect(importRows([["description", "cost"], ["x", "1"]]).problem).toMatch(/name, category and unit/);
    expect(importRows([["name", "category", "unit"]]).problem).toMatch(/no products/);
  });

  it("matches the units a category's line sells in", () => {
    expect(parseUnits("each; m2", "supplies")).toEqual({ units: ["EACH", "SQUARE_METRE"], problem: null });
    expect(parseUnits("6m / 12m", "steel")).toEqual({ units: ["LENGTH_6M", "LENGTH_12M"], problem: null });
    expect(parseUnits("per 1000", "supplies").problem).toMatch(/isn't a unit this category sells in/);
    expect(parseUnits("", "supplies").problem).toMatch(/empty/);
  });

  it("makes unique SKUs and slugs from the name", () => {
    const skus = new Set<string>();
    expect(makeSku("Shade net 80% 3 × 50 m", "garden-tools-irrigation", skus)).toBe("AA-GTI-SHADE-NET-80PCT-3-X-50-M");
    expect(makeSku("Shade net 80% 3 × 50 m", "garden-tools-irrigation", skus)).toBe("AA-GTI-SHADE-NET-80PCT-3-X-50-M-2");
    expect(makeSku("x".repeat(100), "garden-tools-irrigation", skus)).toMatch(/^[A-Z0-9-]{3,60}$/);
    const slugs = new Set(["shade-net"]);
    expect(makeSlug("Shade net", slugs)).toBe("shade-net-2");
  });

  it("checks each row: new, already a product, or why it can't be added", () => {
    const rows = check([
      ["sku", "name", "category", "unit", "cost"],
      ["", "Shade net 80% 3 × 50 m", "garden-tools-irrigation", "roll", "1000"],
      ["", "Garden Hose 20m", "Garden Tools & Irrigation", "each", ""],
      ["AA-GTI-HOSE-20", "Renamed hose", "garden-tools-irrigation", "each", ""],
      ["", "Shade net 80% 3 x 50 m", "garden-tools-irrigation", "roll", ""],
      ["", "IPE 200", "structural-steel", "6m; 12m", ""],
      ["", "Mystery", "nowhere", "each", ""],
      ["", "Stone 19 mm", "Crushed Stone", "ton", ""],
      ["", "Thing", "garden-tools-irrigation", "per 1000", ""],
      ["bad sku", "Thing two", "garden-tools-irrigation", "each", ""],
      ["", "Priced thing", "garden-tools-irrigation", "each", "POA"],
    ]);
    expect(rows[0]).toMatchObject({ status: "NEW", sku: "AA-GTI-SHADE-NET-80PCT-3-X-50-M", slug: "shade-net-80pct-3-x-50-m", units: ["ROLL"], cost: 1000, categoryName: "Garden Tools & Irrigation" });
    expect(rows[1]).toMatchObject({ status: "EXISTS", existingSku: "AA-GTI-HOSE-20" });
    expect(rows[2]).toMatchObject({ status: "EXISTS", existingSku: "AA-GTI-HOSE-20" });
    expect(rows[3]).toMatchObject({ status: "PROBLEM", problem: "The same product as row 2." });
    expect(rows[4]).toMatchObject({ status: "NEW", units: ["LENGTH_6M", "LENGTH_12M"], sku: "AA-SS-IPE-200" });
    expect(rows[5].problem).toMatch(/no category "nowhere"/);
    expect(rows[6].problem).toMatch(/own price bands/);
    expect(rows[7].problem).toMatch(/isn't a unit/);
    expect(rows[8].problem).toMatch(/capital letters/);
    expect(rows[9].problem).toMatch(/isn't an amount/);
  });

  it("reads the template staff download", () => {
    const template = readFileSync(join(__dirname, "../../../web/public/downloads/catalogue-import-template.csv"), "utf8");
    const { rows, problem } = importRows(csvRows(template));
    expect(problem).toBeNull();
    const checked = checkRows(rows, [{ slug: "shade-net-tunnels", name: "Shade Net, Tunnels & Crop Protection", catalogueGroup: "supplies" }, { slug: "fasteners-fixings", name: "Nails, Screws, Bolts & Anchors", catalogueGroup: "supplies" }], [], new Set(), new Set());
    expect(checked.map((r) => [r.status, r.units])).toEqual([
      ["NEW", ["ROLL"]],
      ["NEW", ["KG", "PACK"]],
    ]);
  });
});
