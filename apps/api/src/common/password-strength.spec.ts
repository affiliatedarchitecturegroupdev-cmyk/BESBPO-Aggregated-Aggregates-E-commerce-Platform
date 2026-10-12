import { readFileSync } from "fs";
import { join } from "path";
import { checkPassword } from "./password-strength";

describe("password strength", () => {
  it("rates short, single-class, common and personal passwords weak", () => {
    for (const pw of ["", "Short1!", "alllowercaseletters", "Password12345!", "Qwerty!2024x", "Thandi.Mokoena99!"]) {
      expect(checkPassword(pw, ["Thandi Mokoena", "thandi@example.com"]).level).toBe("weak");
    }
    // 10–11 characters needs three kinds of character.
    expect(checkPassword("bluegravel7").level).toBe("weak");
    expect(checkPassword("Bluegravel7").level).toBe("moderate");
  });

  it("rates long, varied passwords excellent and long passphrases too", () => {
    expect(checkPassword("Gravel-Truck-Rain9").level).toBe("excellent");
    expect(checkPassword("crushed stone under a winter sky").level).toBe("excellent");
    expect(checkPassword("Gravel-Truck-Rain9").suggestions).toEqual([]);
  });

  it("suggests length and the missing kinds of character", () => {
    const result = checkPassword("bluegravel77k");
    expect(result.level).toBe("moderate");
    expect(result.suggestions.join(" ")).toMatch(/longer/);
    expect(result.suggestions.join(" ")).toMatch(/capital/);
    expect(result.suggestions.join(" ")).toMatch(/symbol/);
    expect(result.checks.find((c) => c.label.startsWith("At least one number"))!.met).toBe(true);
  });

  it("flags repeats and sequences", () => {
    expect(checkPassword("Gravel1234Truck!").suggestions.join(" ")).toMatch(/sequences/);
    expect(checkPassword("Graaavel-Truck-9x").suggestions.join(" ")).toMatch(/repeating/);
  });

  it("is the same code the sign-up page uses", () => {
    const web = readFileSync(join(__dirname, "../../../web/src/lib/password-strength.ts"), "utf8");
    expect(web).toBe(readFileSync(join(__dirname, "password-strength.ts"), "utf8"));
  });
});
