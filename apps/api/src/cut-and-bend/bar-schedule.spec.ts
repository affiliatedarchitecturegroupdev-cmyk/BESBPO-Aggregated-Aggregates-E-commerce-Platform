import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BAR_MASS_KG_PER_M, detectScheduleFileType, scheduleCsv, scheduleLine, scheduleLines, totalsBySize } from "./bar-schedule";

const row = { barMark: "A1", member: "Slab", barType: "Y", diameterMm: 12, shapeCode: "00", members: 2, barsPerMember: 10, lengthMm: 6000 };

describe("bar bending schedule maths", () => {
  it("uses the same SANS 920 mass table as the steel catalogue", () => {
    const catalogue = JSON.parse(readFileSync(join(__dirname, "../../../../services/pricing/data/steel_catalogue.json"), "utf8"));
    expect(Object.fromEntries(Object.entries(catalogue.mass_kg_per_m).map(([d, m]) => [Number(d), m]))).toEqual(BAR_MASS_KG_PER_M);
  });

  it("works out a row's bars and mass from the cut length", () => {
    const line = scheduleLine(row, 1);
    expect(line).toMatchObject({ bars: 20, massKg: 106.56 }); // 20 x 6.0 m x 0.888 kg/m
    expect(scheduleLine({ ...row, barType: "r", diameterMm: 8, lengthMm: 1250, members: 40, barsPerMember: 1 }, 1)).toMatchObject({ barType: "R", massKg: 19.75 });
  });

  it("names the row and the problem instead of guessing", () => {
    expect(scheduleLine({ ...row, diameterMm: 14 }, 3)).toBe("Row 3: Y14 isn't a stock size — Y-bar comes in 8, 10, 12, 16, 20, 25, 32, 40 mm.");
    expect(scheduleLine({ ...row, barType: "R", diameterMm: 32 }, 1)).toContain("R32 isn't a stock size");
    expect(scheduleLine({ ...row, shapeCode: "A" }, 2)).toContain("two-digit SANS 282 code");
    expect(scheduleLine({ ...row, lengthMm: 14000 }, 2)).toContain("longer runs need a lap");
    expect(scheduleLine({ ...row, members: 1.5 }, 2)).toContain("whole number");
    expect(scheduleLine({ ...row, barMark: "=cmd()" }, 2)).toContain("bar mark");
    const { lines, errors } = scheduleLines([row, { ...row, diameterMm: 14 }]);
    expect([lines.length, errors]).toEqual([1, [expect.stringMatching(/^Row 2:/)]]);
  });

  it("totals by size, largest first", () => {
    const { lines } = scheduleLines([row, { ...row, barMark: "B1", diameterMm: 16, members: 1, lengthMm: 3000 }, { ...row, barMark: "A2", lengthMm: 1000 }]);
    const { bySize, totalMassKg } = totalsBySize(lines);
    expect(bySize).toEqual([
      { barType: "Y", diameterMm: 16, bars: 10, metres: 30, massKg: 47.34 },
      { barType: "Y", diameterMm: 12, bars: 40, metres: 140, massKg: 124.32 },
    ]);
    expect(totalMassKg).toBe(171.66);
  });

  it("exports CSV for the merchant with formulas neutralised", () => {
    const { lines } = scheduleLines([{ ...row, member: '=HYPERLINK("x")' }]);
    const csv = scheduleCsv(lines);
    expect(csv.split("\r\n")[0]).toBe("Bar mark,Member,Type,Size (mm),Shape code,No. of members,Bars per member,Total bars,Cut length (mm),Mass (kg)");
    expect(csv.split("\r\n")[1]).toBe(`A1,"'=HYPERLINK(""x"")",Y,12,00,2,10,20,6000,106.56`);
  });

  it("accepts schedule files by content: PDF, images, Excel and CSV", () => {
    expect(detectScheduleFileType(Buffer.from("%PDF-1.7\n"), "bbs.pdf")?.extension).toBe("pdf");
    expect(detectScheduleFileType(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("....xl/workbook.xml")]), "bbs.xlsx")?.extension).toBe("xlsx");
    expect(detectScheduleFileType(Buffer.from("Bar mark,Size\nA1,12\n"), "bbs.csv")?.extension).toBe("csv");
    expect(detectScheduleFileType(Buffer.from("Bar mark,Size\n"), "bbs.exe")).toBeNull();
    expect(detectScheduleFileType(Buffer.from([0x4d, 0x5a, 0x90, 0x00]), "bbs.csv")).toBeNull(); // binary, whatever its name
    expect(detectScheduleFileType(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("word/document.xml")]), "bbs.xlsx")).toBeNull();
  });
});
