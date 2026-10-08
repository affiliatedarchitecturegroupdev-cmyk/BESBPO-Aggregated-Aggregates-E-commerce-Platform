import { parseOperatingCostCsv, toAmount, toCategory, toMonth } from "./opex-import";

describe("operating cost import", () => {
  it("reads months, amounts and categories from common export formats", () => {
    expect(["2026-10", "2026-10-31", "31/10/2026", "Oct 2026", "October-2026", "2026-13", "soon"].map(toMonth)).toEqual(["2026-10", "2026-10", "2026-10", "2026-10", "2026-10", null, null]);
    expect(["R 18,500.00", "1 234.50", "(250.00)", "-10", "12,50", "abc"].map(toAmount)).toEqual([18500, 1234.5, -250, -10, null, null]);
    expect(toCategory("RENT").category).toBe("RENT");
    expect(toCategory("Salaries & wages").category).toBe("SALARIES");
    expect(toCategory("", "Google Ads October").category).toBe("MARKETING");
    expect(toCategory("Sundry")).toEqual({ category: "OTHER", matched: false });
  });

  it("parses a Xero-style export and reports bad rows by line", () => {
    const csv = ["Date,Account,Description,Net Amount,Reference", "2026-10-31,Rent,Office rent October,18500,INV-1", "31/10/2026,Payroll,October salaries,\"85,000.00\",JNL-9", ",Rent,No date,10,", "2026-10-31,Rent,Credit,-50,"].join("\n");
    const { rows, errors, columns } = parseOperatingCostCsv(csv);
    expect(columns).toMatchObject({ month: "date", category: "account", description: "description", amount: "net amount", reference: "reference" });
    expect(rows.map((r) => [r.month, r.category, r.amountExVat, r.reference])).toEqual([
      ["2026-10", "RENT", 18500, "INV-1"],
      ["2026-10", "SALARIES", 85000, "JNL-9"],
    ]);
    expect(errors.map((e) => e.line)).toEqual([4, 5]);
  });

  it("names the missing columns", () => {
    expect(parseOperatingCostCsv("foo,bar\n1,2").errors[0].message).toMatch(/month, description, amount/);
  });
});
