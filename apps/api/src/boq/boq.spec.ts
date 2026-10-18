import { deflateRawSync } from "node:zlib";
import { boqItems, csvRows, indexCatalogue, matchItem, parseQuantity, unitFromText } from "./boq";
import { columnIndex, readFirstSheet } from "./xlsx";

/** A minimal .xlsx (zip) for tests: the reader doesn't check CRCs, so they're left at 0. */
function zip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = deflateRawSync(Buffer.from(text, "utf8"));
    const nameBuf = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(Buffer.byteLength(text), 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(Buffer.byteLength(text), 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, data);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const dir = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

const catalogue = indexCatalogue([
  { sku: "AGG-19", name: "19mm Crushed Stone", category: "Stone & Aggregates", unitsOfSale: ["BULK_TON", "BULK_M3"] },
  { sku: "AGG-13", name: "13.2mm Crushed Stone", category: "Stone & Aggregates", unitsOfSale: ["BULK_TON"] },
  { sku: "SND-PL", name: "Plaster Sand", category: "Sand", unitsOfSale: ["BULK_M3", "BAGGED"] },
  { sku: "CEM-425", name: "PPC SureBuild 42,5N Cement", category: "Cement", unitsOfSale: ["BAG_50KG"] },
]);

describe("bill of quantities", () => {
  it("reads quantities written the South African way", () => {
    expect(parseQuantity("1 250,5")).toBe(1250.5);
    expect(parseQuantity("1,250.5")).toBe(1250.5);
    expect(parseQuantity("12")).toBe(12);
    expect(parseQuantity("1,250,000")).toBe(1250000);
    expect(parseQuantity("2,5")).toBe(2.5);
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("abc")).toBeNull();
    expect(parseQuantity("0")).toBeNull();
  });

  it("finds the columns by header and skips totals and blank rows", () => {
    const rows = csvRows("Project: Erf 12\nItem;Description;Unit;Qty\n1;19mm crushed stone;m3;24\n2;Plaster sand;m³;8,5\n;Subtotal;;32,5\n3;Cement 42,5N 50kg;bags;120\n");
    expect(boqItems(rows)).toEqual([
      { row: 3, description: "19mm crushed stone", quantity: 24, unit: "m3" },
      { row: 4, description: "Plaster sand", quantity: 8.5, unit: "m³" },
      { row: 6, description: "Cement 42,5N 50kg", quantity: 120, unit: "bags" },
    ]);
  });

  it("guesses the columns when there's no header row", () => {
    expect(boqItems(csvRows("19mm stone for slab,t,30\nbuilding sand,m3,6\n"))).toEqual([
      { row: 1, description: "19mm stone for slab", quantity: 30, unit: "t" },
      { row: 2, description: "building sand", quantity: 6, unit: "m3" },
    ]);
  });

  it("suggests the right product and unit, telling 19mm from 13.2mm", () => {
    const [best] = matchItem({ row: 1, description: "Supply 19mm crushed stone", quantity: 24, unit: "m3" }, catalogue);
    expect(best).toMatchObject({ sku: "AGG-19", unitOfSale: "BULK_M3", unitGuessed: false });
    const [cement] = matchItem({ row: 2, description: "Cement 42,5N 50kg", quantity: 120, unit: "bags" }, catalogue);
    expect(cement).toMatchObject({ sku: "CEM-425", unitOfSale: "BAG_50KG" });
    expect(matchItem({ row: 3, description: "Roof trusses, engineered", quantity: 14, unit: "no" }, catalogue)).toEqual([]);
    expect(unitFromText("t", "stone")).toBe("BULK_TON");
    expect(unitFromText(null, "stone 6m3")).toBe("BULK_M3");
  });

  it("reads the first worksheet of an Excel file, shared strings and all", () => {
    const file = zip({
      "xl/workbook.xml": '<workbook><sheets><sheet name="BOQ" sheetId="1" r:id="rId1"/></sheets></workbook>',
      "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
      "xl/sharedStrings.xml": "<sst><si><t>Description</t></si><si><t>Qty</t></si><si><r><t>19mm </t></r><r><t>stone &amp; dust</t></r></si></sst>",
      "xl/worksheets/sheet1.xml": '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>24.5</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Plaster sand</t></is></c><c r="C3"><v>8</v></c></row></sheetData></worksheet>',
    });
    const rows = readFirstSheet(file);
    expect(rows).toEqual([
      ["Description", "", "Qty"],
      ["19mm stone & dust", "", "24.5"],
      ["Plaster sand", "", "8"],
    ]);
    expect(boqItems(rows).map((i) => [i.description, i.quantity])).toEqual([["19mm stone & dust", 24.5], ["Plaster sand", 8]]);
    expect(columnIndex("AA7")).toBe(26);
    expect(() => readFirstSheet(Buffer.from("not a zip at all"))).toThrow(/valid Excel/);
  });
});
