import { normaliseMobile } from "./mobile-number";

describe("normaliseMobile", () => {
  it("accepts South African mobiles typed locally or internationally", () => {
    for (const n of ["082 123 4567", "0821234567", "+27 82 123 4567", "27821234567", "0027 82 123 4567", "(082) 123-4567", "071 555 0000", "060 123 4567"]) {
      expect(normaliseMobile(n)).toMatch(/^\+27[6-8]\d{8}$/);
    }
    expect(normaliseMobile("082 123 4567")).toBe("+27821234567");
  });

  it("accepts other countries only with the country code", () => {
    expect(normaliseMobile("+44 7700 900123")).toBe("+447700900123");
    expect(normaliseMobile("+264 81 123 4567")).toBe("+264811234567");
  });

  it("refuses landlines, short numbers and text", () => {
    for (const n of ["011 123 4567", "+27 11 123 4567", "08212345", "0821234567890", "call me", "", null, undefined, "7700900123"]) {
      expect(normaliseMobile(n)).toBeNull();
    }
  });
});
