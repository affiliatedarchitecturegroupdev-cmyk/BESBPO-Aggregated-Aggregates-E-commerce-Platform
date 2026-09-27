/** Accepted upload formats, identified by their leading bytes rather than the client's claimed type. */
const SIGNATURES: { contentType: string; extension: string; magic: number[] }[] = [
  { contentType: "application/pdf", extension: "pdf", magic: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { contentType: "image/png", extension: "png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { contentType: "image/jpeg", extension: "jpg", magic: [0xff, 0xd8, 0xff] },
];

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Product photography: PNG, JPEG or WebP, identified by content. */
export function detectImageType(body: Buffer): { contentType: string; extension: string } | null {
  const isWebp = body.subarray(0, 4).toString("latin1") === "RIFF" && body.subarray(8, 12).toString("latin1") === "WEBP";
  if (isWebp) return { contentType: "image/webp", extension: "webp" };
  const detected = detectDocumentType(body);
  return detected && detected.contentType.startsWith("image/") ? detected : null;
}

export function detectDocumentType(body: Buffer): { contentType: string; extension: string } | null {
  const match = SIGNATURES.find(({ magic }) => magic.every((byte, i) => body[i] === byte));
  return match ? { contentType: match.contentType, extension: match.extension } : null;
}

/** A storage- and header-safe file name, keeping the detected extension. */
export function safeFileName(original: string | undefined, extension: string): string {
  const base = (original ?? "").split(/[\\/]/).pop() ?? ""; // drop any client-side path
  const stem = base
    .replace(/(.)\.[^.]*$/, "$1") // drop the claimed extension (but not a leading dot)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${stem || "document"}.${extension}`;
}
