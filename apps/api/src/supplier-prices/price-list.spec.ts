import { markupOf, matchUnit, minimumPrice, nameKey, parseAmount, priceRows, suggestPrice } from "./price-list";

describe("supplier price lists", () => {
  it("reads South African amounts", () => {
    expect(parseAmount("R 1 234,50")).toBe(1234.5);
    expect(parseAmount("1,234.50")).toBe(1234.5);
    expect(parseAmount("1.234,5")).toBe(1234.5);
    expect(parseAmount("89")).toBe(89);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("POA")).toBeNull();
    expect(parseAmount("0")).toBeNull();
  });

  it("finds the columns under a title row and reads each product", () => {
    const { rows, problem } = priceRows([
      ["Coastal Timber price list — November"],
      ["Item code", "Description", "UOM", "Nett price"],
      ["CT-114", "CCA pole 50-75mm x 1.8m", "each", "R45,00"],
      ["", "", "", ""],
      ["CT-200", "Mystery item", "ea", "POA"],
    ]);
    expect(problem).toBeNull();
    expect(rows).toEqual([
      { rowNumber: 3, sku: null, supplierCode: "CT-114", description: "CCA pole 50-75mm x 1.8m", unit: "each", cost: 45, problem: null },
      { rowNumber: 5, sku: null, supplierCode: "CT-200", description: "Mystery item", unit: "ea", cost: null, problem: 'No cost on this row ("POA").' },
    ]);
    expect(priceRows([["a", "b"], ["1", "2"]]).problem).toMatch(/columns/);
  });

  it("reads our own SKU column when the template is used", () => {
    const { rows } = priceRows([["sku", "supplier_code", "description", "unit", "cost"], ["aa-tmb-pole-cca-5075-1-8", "", "", "", "45"]]);
    expect(rows[0]).toMatchObject({ sku: "AA-TMB-POLE-CCA-5075-1-8", cost: 45 });
    expect(priceRows([["supplier_code", "cost"], ["CT-1", "10"]]).rows[0]).toMatchObject({ supplierCode: "CT-1", cost: 10 });
  });

  it("matches the units suppliers write to the product's units", () => {
    const each = [{ unit: "EACH", label: "× item" }];
    expect(matchUnit(null, each)).toBe("EACH");
    expect(matchUnit("ea", each)).toBe("EACH");
    const cement = [{ unit: "BAG_25KG", label: "× 25kg bag" }, { unit: "BAG_50KG", label: "× 50kg bag" }];
    expect(matchUnit("50kg", cement)).toBe("BAG_50KG");
    expect(matchUnit("bag", cement)).toBeNull();
    expect(matchUnit(null, cement)).toBeNull();
    expect(matchUnit("per m2", [{ unit: "SQUARE_METRE", label: "m²" }, { unit: "EACH", label: "× item" }])).toBe("SQUARE_METRE");
    expect(matchUnit("× 6 m length", [{ unit: "LENGTH_6M", label: "× 6 m length" }, { unit: "TONNE", label: "tonne" }])).toBe("LENGTH_6M");
  });

  it("suggests the sell price from the cost and the standard markup, never below the minimum margin", () => {
    expect(suggestPrice(45, 8)).toBe(48.6);
    expect(minimumPrice(45)).toBe(46.35);
    expect(markupOf(54, 45)).toBe(20);
    expect(nameKey("CCA Pole 50–75 mm × 1.8 m")).toBe(nameKey("cca pole 50 75 mm x 1.8 m"));
  });
});
