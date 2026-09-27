import { detectDocumentType, detectImageType, safeFileName } from "./file-type";

describe("detectDocumentType", () => {
  it("recognises PDF, PNG and JPEG by content", () => {
    expect(detectDocumentType(Buffer.from("%PDF-1.7\n..."))?.contentType).toBe("application/pdf");
    expect(detectDocumentType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.contentType).toBe("image/png");
    expect(detectDocumentType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.contentType).toBe("image/jpeg");
  });

  it("rejects anything else, whatever it is called", () => {
    expect(detectDocumentType(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectDocumentType(Buffer.from("MZ\x90\x00"))).toBeNull();
    expect(detectDocumentType(Buffer.alloc(0))).toBeNull();
  });
});

describe("safeFileName", () => {
  it("strips paths and unsafe characters and forces the detected extension", () => {
    expect(safeFileName("../../etc/passwd", "pdf")).toBe("passwd.pdf");
    expect(safeFileName("C:\\scans\\coa.v2.jpeg", "jpg")).toBe("coa-v2.jpg");
    expect(safeFileName(".env", "pdf")).toBe("env.pdf");
    expect(safeFileName("COA Batch 12 (Pinetown).exe", "pdf")).toBe("COA-Batch-12-Pinetown.pdf");
    expect(safeFileName(undefined, "png")).toBe("document.png");
  });
});

describe("detectImageType", () => {
  it("accepts PNG, JPEG and WebP but not PDF", () => {
    expect(detectImageType(Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ", "latin1"))?.contentType).toBe("image/webp");
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.contentType).toBe("image/jpeg");
    expect(detectImageType(Buffer.from("%PDF-1.7"))).toBeNull();
  });
});
