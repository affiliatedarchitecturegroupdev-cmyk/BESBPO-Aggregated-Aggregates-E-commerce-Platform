import { boqKey, cleanSynonyms, clickThrough, isSectionSlot, looksPersonal, normaliseText, searchKey } from "./discovery";

describe("search insights helpers", () => {
  it("normalises searches before counting them", () => {
    expect(normaliseText("  JoJo   Tank!!  5000L ")).toBe("jojo tank 5000l");
    expect(normaliseText("38×114 SA Pine")).toBe("38×114 sa pine");
    expect(searchKey("x")).toBeNull();
    expect(searchKey("!!!")).toBeNull();
    expect(searchKey("Gum Poles")).toBe("gum poles");
  });

  it("never keeps text that could identify someone", () => {
    expect(looksPersonal("call me 082 555 1234")).toBe(true);
    expect(looksPersonal("someone@example.com")).toBe(true);
    expect(looksPersonal("8001015009087")).toBe(true);
    expect(looksPersonal("https://example.com/x")).toBe(true);
    expect(looksPersonal("IBR 0.47 mm 6.0 m")).toBe(false);
    expect(searchKey("082 555 1234")).toBeNull();
    expect(boqKey("Contact 0825551234 for site")).toBeNull();
    expect(boqKey("Supply and fix 22 mm Class 0 copper pipe")).toBe("supply and fix 22 mm class 0 copper pipe");
    expect(boqKey("12")).toBeNull();
  });

  it("accepts only known section names", () => {
    expect(isSectionSlot("home:best-sellers")).toBe(true);
    expect(isSectionSlot("department:timber:top-sellers")).toBe(true);
    expect(isSectionSlot("collection:winter-ready")).toBe(true);
    expect(isSectionSlot("promo:x")).toBe(false);
    expect(isSectionSlot("home:<script>")).toBe(false);
    expect(isSectionSlot("home:")).toBe(false);
    expect(isSectionSlot(42)).toBe(false);
  });

  it("cleans staff synonym groups", () => {
    expect(cleanSynonyms(["JoJo", "water tank", "jojo", " Water  Tank "])).toEqual({ terms: ["jojo", "water tank"] });
    expect(cleanSynonyms(["tank"])).toEqual({ problems: ["A synonym group needs at least two different words or phrases."] });
    expect("problems" in cleanSynonyms(["a@b.co", "tank"])).toBe(true);
  });

  it("works out click-through", () => {
    expect(clickThrough(3, 200)).toBe(1.5);
    expect(clickThrough(0, 0)).toBeNull();
  });
});
