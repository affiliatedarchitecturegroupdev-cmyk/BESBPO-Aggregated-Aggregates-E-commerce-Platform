import { detectCvType } from "./file-type";

describe("CV file detection", () => {
  it("accepts PDF and Word (.docx) by content, whatever the name says", () => {
    expect(detectCvType(Buffer.from("%PDF-1.7\n..."))?.extension).toBe("pdf");
    const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("....[Content_Types].xml....word/document.xml")]);
    expect(detectCvType(docx)?.extension).toBe("docx");
  });

  it("rejects images, executables, other zips and old .doc files", () => {
    expect(detectCvType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBeNull();
    expect(detectCvType(Buffer.from("MZ\x90\x00"))).toBeNull();
    expect(detectCvType(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("xl/workbook.xml")]))).toBeNull();
    expect(detectCvType(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBeNull();
  });
});
