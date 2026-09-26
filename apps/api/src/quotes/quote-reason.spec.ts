import { quoteReasonCode, quoteReference } from "./quote-reason";

describe("quoteReasonCode", () => {
  it.each([
    [["VOLUME_THRESHOLD", "OVER_MAX_DISTANCE"], "BOTH"],
    [["VOLUME_THRESHOLD"], "VOLUME_CIVIL_BULK"],
    [["OVER_MAX_DISTANCE", "BAGGED_OUT_OF_RANGE"], "DELIVERY_OVER_100KM"],
    [["SMALL_LOAD_OUT_OF_RANGE"], "DELIVERY_NOT_PRICED"],
    [[], "CUSTOMER_REQUEST"],
  ] as const)("%j -> %s", (codes, expected) => {
    expect(quoteReasonCode([...codes])).toBe(expected);
  });
});

describe("quoteReference", () => {
  it("is dated and uses an unambiguous alphabet", () => {
    const reference = quoteReference(new Date("2026-09-26T10:00:00Z"), () => 0.99);
    expect(reference).toBe("AAQ-260926-ZZZZ");
    expect(quoteReference()).toMatch(/^AAQ-\d{6}-[2-9A-HJ-NP-Z]{4}$/);
  });
});
