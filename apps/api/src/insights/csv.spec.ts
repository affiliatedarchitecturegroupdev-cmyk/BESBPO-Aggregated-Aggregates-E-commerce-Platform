import { toCsv, withoutKeys } from "./csv";

describe("insights CSV", () => {
  it("quotes, escapes and neutralises spreadsheet formulas", () => {
    const csv = toCsv([
      { label: 'Sand, "river"', revenue: 10.5 },
      { label: "=HYPERLINK(1)", revenue: null, extra: -3 },
    ]);
    expect(csv).toBe('label,revenue,extra\r\n"Sand, ""river""",10.5,\r\n\'=HYPERLINK(1),,-3\r\n');
  });

  it("removes keys at any depth", () => {
    expect(withoutKeys({ a: 1, cogs: 2, rows: [{ cogs: 3, b: 4 }], when: new Date(0) }, ["cogs"])).toEqual({ a: 1, rows: [{ b: 4 }], when: new Date(0) });
  });
});
