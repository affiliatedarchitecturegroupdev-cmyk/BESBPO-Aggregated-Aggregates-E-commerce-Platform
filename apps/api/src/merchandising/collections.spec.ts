import { cleanRule, collectionProblems, isLive, slugify } from "./collections";

describe("collections", () => {
  const base = { slug: "carport-build", skus: ["AA-1"], rule: null, placements: ["HOMEPAGE"], startsAt: null, endsAt: null };

  it("makes link names from titles", () => {
    expect(slugify("Back to Site — 2027!")).toBe("back-to-site-2027");
    expect(slugify("Paint & Waterproofing")).toBe("paint-and-waterproofing");
  });

  it("accepts a well-formed collection and explains what's wrong with a bad one", () => {
    expect(collectionProblems(base)).toEqual([]);
    expect(collectionProblems({ ...base, placements: ["DEPARTMENT:garden-landscaping"] })).toEqual([]);
    const problems = collectionProblems({ ...base, slug: "Bad Slug", skus: [], placements: ["SIDEBAR"], startsAt: new Date("2026-12-01"), endsAt: new Date("2026-11-01") });
    expect(problems.join(" ")).toMatch(/link name/);
    expect(problems.join(" ")).toMatch(/Unknown placement "SIDEBAR"/);
    expect(problems.join(" ")).toMatch(/Pick some products, or set a rule/);
    expect(problems.join(" ")).toMatch(/end date must be after/);
    expect(collectionProblems({ ...base, skus: [], rule: { maxPrice: 500 } })).toEqual([]);
    expect(collectionProblems({ ...base, rule: { maxPrice: -1 } })).toEqual(["The price limit must be between R1 and R1,000,000."]);
  });

  it("keeps only the rule fields the storefront understands", () => {
    expect(cleanRule({ query: "  sealant ", availability: "online", maxPrice: "500", category: "" } as never)).toEqual({ query: "sealant", availability: "online", maxPrice: 500 });
    expect(cleanRule({ availability: "maybe" } as never)).toBeNull();
    expect(cleanRule(null)).toBeNull();
  });

  it("is live only while active and between its dates", () => {
    const now = new Date("2026-11-15T10:00:00Z");
    expect(isLive({ isActive: true, startsAt: null, endsAt: null }, now)).toBe(true);
    expect(isLive({ isActive: false, startsAt: null, endsAt: null }, now)).toBe(false);
    expect(isLive({ isActive: true, startsAt: new Date("2026-11-20"), endsAt: null }, now)).toBe(false);
    expect(isLive({ isActive: true, startsAt: null, endsAt: new Date("2026-11-15T10:00:00Z") }, now)).toBe(false);
  });
});
