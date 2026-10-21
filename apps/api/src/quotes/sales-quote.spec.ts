import { priceQuoteLine, quotationNumber, quoteTotals } from "./sales-quote";

describe("sales quotation pricing", () => {
  const listed = { listUnitPrice: 400, listUnitCost: 312.5, standardMarkupPercent: 28 };
  const unpriced = { listUnitPrice: null, listUnitCost: null, standardMarkupPercent: 8 };

  it("uses the list price at the client's tier when staff give nothing", () => {
    expect(priceQuoteLine({}, listed)).toEqual({ unitPrice: 400, unitCost: 312.5, markupPercent: 28, priceSource: "LIST" });
  });

  it("prices a supplier's cost with the product's own markup, or the one staff choose", () => {
    expect(priceQuoteLine({ unitCost: 100 }, unpriced)).toEqual({ unitPrice: 108, unitCost: 100, markupPercent: 8, priceSource: "SUPPLIER_COST" });
    expect(priceQuoteLine({ unitCost: 100, markupPercent: 22.5 }, unpriced)).toEqual({ unitPrice: 122.5, unitCost: 100, markupPercent: 22.5, priceSource: "SUPPLIER_COST" });
    expect(priceQuoteLine({ unitCost: 99.99 }, { ...unpriced, standardMarkupPercent: null })).toMatchObject({ unitPrice: 107.99, markupPercent: 8 });
  });

  it("takes a typed price as given and works out its markup when a cost is known", () => {
    expect(priceQuoteLine({ unitPrice: 450 }, listed)).toEqual({ unitPrice: 450, unitCost: 312.5, markupPercent: 44, priceSource: "MANUAL" });
    expect(priceQuoteLine({ unitPrice: 90 }, unpriced)).toEqual({ unitPrice: 90, unitCost: null, markupPercent: null, priceSource: "MANUAL" });
  });

  it("leaves an unpriced line unpriced until staff price it", () => {
    expect(priceQuoteLine({}, unpriced)).toBeNull();
  });

  it("adds up, with VAT included and the margin for staff", () => {
    const t = quoteTotals(
      [
        { quantity: 6, unitPrice: 400, unitCost: 312.5 },
        { quantity: 20, unitPrice: 108, unitCost: 100 },
      ],
      450,
    );
    expect(t).toEqual({ subtotal: 4560, deliveryFee: 450, total: 5010, vat: 653.48, exVat: 4356.52, cost: 3875, margin: 685, marginPercent: 15.02 });
    expect(quoteTotals([{ quantity: 1, unitPrice: 90, unitCost: null }], 0)).toMatchObject({ cost: null, margin: null, marginPercent: null });
  });

  it("numbers quotations like invoices", () => {
    expect(quotationNumber(BigInt(42))).toBe("AAQ-000042");
  });
});
