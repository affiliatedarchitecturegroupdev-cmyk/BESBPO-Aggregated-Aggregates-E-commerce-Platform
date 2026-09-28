import { coordinateError, haversineKm, parseSupplierCsv, suppliersToCsv, townFromAddress } from "./supplier-csv";

// Fictional suppliers: the real supplier database never enters the repository.
const CSV = `supplier_id,supplier_name,tier,province,address_location,core_categories,category_codes,category_labels
TST-001,Example Quarry North,Tier 1,Gauteng,"Plot 1, Some Road, Centurion","CAT-01 (G1–G5), CAT-02 (19mm)",CAT-01;CAT-02,Sub-Base & Base Course;Crushed Stone
TST-002,Example Sand Works,Tier 2,KwaZulu-Natal,Umgeni Basin Depot,CAT-03 (Washed River Sand),CAT-03,Sand & Fine Aggregates
`;

describe("parseSupplierCsv", () => {
  it("parses the supplier database format, mapping categories and towns", () => {
    const { rows, errors } = parseSupplierCsv(CSV);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({
      externalId: "TST-001",
      tier: "TIER_1",
      province: "Gauteng",
      city: "Centurion",
      categorySlugs: ["sub-base-base-course", "crushed-stone"],
      productNotes: "CAT-01 (G1–G5), CAT-02 (19mm)",
    });
    // Columns absent from the file stay undefined, so a re-import doesn't wipe staff edits.
    expect(rows[0].latitude).toBeUndefined();
    expect(rows[0].isActive).toBeUndefined();
    expect(rows[1]).toMatchObject({ tier: "TIER_2", city: "Umgeni Basin Depot", categorySlugs: ["sand-fine-aggregates"] });
  });

  it("reports every bad row with its line number and imports nothing silently", () => {
    const bad = [
      "supplier_id,supplier_name,tier,province,address_location,core_categories,category_codes,category_labels,latitude,longitude",
      'TST-001,Example Quarry North,Tier 1,Gauteng,"Plot 1, Centurion",x,CAT-01,x',
      "TST-002,Example Sand Works,Tier 2,KwaZulu-Natal,Umgeni Basin Depot,x,CAT-03,x,-29.8,31.0",
      "TST-003,,Tier 3,Atlantis,,x,CAT-99,x",
      'TST-001,Duplicate,Tier 1,Gauteng,"A, B",x,CAT-01,x',
      'TST-004,Swapped,Tier 1,Gauteng,"A, B",x,CAT-01,x,28.1,-25.8',
    ].join("\n");
    const { rows, errors } = parseSupplierCsv(bad);
    expect(rows.map((r) => r.externalId)).toEqual(["TST-001", "TST-002"]);
    expect(rows[1]).toMatchObject({ latitude: -29.8, longitude: 31.0 });
    expect(errors.map((e) => e.line)).toEqual([4, 5, 6]);
    expect(errors[0].message).toMatch(/supplier_name is empty.*Tier 3.*Atlantis.*address_location is empty.*CAT-99/);
    expect(errors[1].message).toMatch(/appears more than once/);
    expect(errors[2].message).toMatch(/latitude 28.1 is outside South Africa/);
  });

  it("rejects files that aren't the supplier database", () => {
    expect(parseSupplierCsv("name,city\nx,y\n").errors[0].message).toMatch(/Missing column/);
    expect(parseSupplierCsv("").errors[0].message).toMatch(/no supplier rows/);
  });

  it("round-trips through export, including coordinates staff added", () => {
    const { rows } = parseSupplierCsv(CSV);
    const exported = suppliersToCsv(
      rows.map((r) => ({ ...r, latitude: -25.86, longitude: 28.19, contactName: null, contactPhone: null, isActive: true })),
    );
    const again = parseSupplierCsv(exported);
    expect(again.errors).toEqual([]);
    expect(again.rows[0]).toMatchObject({ externalId: "TST-001", latitude: -25.86, longitude: 28.19, isActive: true, city: "Centurion" });
    expect(again.rows[0].categorySlugs).toEqual(rows[0].categorySlugs);
  });
});

describe("geography helpers", () => {
  it("derives the town from the last address part", () => {
    expect(townFromAddress("235 Pope Ellis Drive, Ashburton, Pietermaritzburg")).toBe("Pietermaritzburg");
    expect(townFromAddress("Mahikeng / Lichtenburg Lime District")).toBe("Mahikeng / Lichtenburg Lime District");
  });

  it("validates coordinates against South Africa", () => {
    expect(coordinateError(-29.6, 30.38)).toBeNull();
    expect(coordinateError(29.6, 30.38)).toMatch(/latitude/);
    expect(coordinateError(-29.6, 3.38)).toMatch(/longitude/);
  });

  it("measures straight-line distance", () => {
    // Durban city centre to Pietermaritzburg city centre is ~62km as the crow flies.
    const km = haversineKm({ latitude: -29.8587, longitude: 31.0218 }, { latitude: -29.6006, longitude: 30.3794 });
    expect(km).toBeGreaterThan(60);
    expect(km).toBeLessThan(70);
  });

  it("reads the B2B research list as unverified leads with CAT-10/11 categories", () => {
    const csv = [
      "supplier_id,supplier_name,category,province,address_location,products_notes,sku_category_codes,source_url",
      'TST-B-1,Test Cement Works,Cement & Binders,Northern Cape,"Kiln Road, Testburg",42.5N bulk cement,CAT-10,https://example.com/plant',
      'TST-B-2,Test Admixtures,"Mortars, Grouts & Admixtures",Gauteng,"1 Chem St, Isando",Admixtures,CAT-11,https://example.com/chem',
    ].join("\n");
    const { rows, errors } = parseSupplierCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ categorySlugs: ["cement-hydraulic-binders"], isVerifiedPartner: false, sourceUrl: "https://example.com/plant", tier: "TIER_2", city: "Testburg", productNotes: "42.5N bulk cement" });
    expect(rows[1].categorySlugs).toEqual(["mortars-grouts-admixtures"]);
  });

  it("treats rows without a source as verified partners, and a verified column overrides", () => {
    const csv = [
      "supplier_id,supplier_name,tier,province,address_location,category_codes,source_url,verified",
      "TST-V-1,Test Quarry,Tier 1,Gauteng,\"Road 1, Midrand\",CAT-01,,",
      "TST-V-2,Test Plant,Tier 2,Gauteng,\"Road 2, Midrand\",CAT-02,https://example.com,yes",
      "TST-V-3,Test Pit,Tier 2,Gauteng,\"Road 3, Midrand\",CAT-02,ftp://nope,",
    ].join("\n");
    const { rows, errors } = parseSupplierCsv(csv);
    expect(rows.map((r) => r.isVerifiedPartner)).toEqual([true, true]);
    expect(errors).toEqual([{ line: 4, message: expect.stringContaining("source_url must be a web address") }]);
  });
});
