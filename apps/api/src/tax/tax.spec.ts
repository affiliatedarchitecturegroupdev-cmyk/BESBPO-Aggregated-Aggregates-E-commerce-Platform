import { groupVatNumber, taxWording, vatRegistered } from "./tax";

describe("VAT registration switch", () => {
  it("is off until a valid VAT number is set", () => {
    expect(vatRegistered("")).toBe(false);
    expect(vatRegistered("replace-me")).toBe(false);
    expect(vatRegistered("123456789")).toBe(false);
    expect(vatRegistered("4123 456 789")).toBe(true);
    expect(groupVatNumber("4123 456 789")).toBe("4123456789");
  });

  it("uses neutral wording while not registered", () => {
    const neutral = taxWording(false);
    expect(Object.values(neutral).join(" ")).not.toMatch(/VAT/);
    expect(neutral.total).toBe("Total amount payable");
    expect(taxWording(true).total).toBe("Total (VAT inclusive)");
  });
});
