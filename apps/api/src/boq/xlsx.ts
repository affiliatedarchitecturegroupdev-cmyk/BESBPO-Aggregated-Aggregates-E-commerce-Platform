import { inflateRawSync } from "node:zlib";

/**
 * A small, dependency-free reader for the first worksheet of an .xlsx file
 * (a zip of XML parts): enough for a bill of quantities — cell text and
 * numbers, not formulas, styles or dates. Sizes are capped so a crafted file
 * can't expand into gigabytes.
 */

const MAX_PART_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 2000;

type Entry = { name: string; method: number; compressedSize: number; size: number; offset: number };

function entries(zip: Buffer): Entry[] {
  // The end-of-central-directory record is in the last 64 KB (after an optional comment).
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65_557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This isn't a valid Excel (.xlsx) file.");
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  const out: Entry[] = [];
  for (let n = 0; n < count && p + 46 <= zip.length; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) break;
    const method = zip.readUInt16LE(p + 10);
    const compressedSize = zip.readUInt32LE(p + 20);
    const size = zip.readUInt32LE(p + 24);
    const nameLength = zip.readUInt16LE(p + 28);
    const extraLength = zip.readUInt16LE(p + 30);
    const commentLength = zip.readUInt16LE(p + 32);
    const offset = zip.readUInt32LE(p + 42);
    out.push({ name: zip.subarray(p + 46, p + 46 + nameLength).toString("utf8"), method, compressedSize, size, offset });
    p += 46 + nameLength + extraLength + commentLength;
  }
  return out;
}

function read(zip: Buffer, entry: Entry): string {
  if (entry.size > MAX_PART_BYTES) throw new Error("This spreadsheet is too large to read — save the bill of quantities on its own sheet.");
  const p = entry.offset;
  if (zip.readUInt32LE(p) !== 0x04034b50) throw new Error("This Excel file is damaged.");
  const start = p + 30 + zip.readUInt16LE(p + 26) + zip.readUInt16LE(p + 28);
  const data = zip.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data.toString("utf8");
  if (entry.method === 8) return inflateRawSync(data, { maxOutputLength: MAX_PART_BYTES }).toString("utf8");
  throw new Error("This Excel file uses a compression we can't read — save it again as .xlsx or .csv.");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** The text of every <t> inside a fragment (rich text is split across several). */
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1])).join("");

/** Column letters to a 0-based index: A → 0, AA → 26. */
export function columnIndex(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "A";
  return [...letters].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1;
}

/** The first worksheet as rows of cell strings. */
export function readFirstSheet(zip: Buffer): string[][] {
  const all = entries(zip);
  const find = (name: string) => all.find((e) => e.name === name);
  const shared = find("xl/sharedStrings.xml");
  const strings = shared ? [...read(zip, shared).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1])) : [];

  // The first sheet in workbook order, else the first worksheet part.
  let sheetPath: string | undefined;
  const workbook = find("xl/workbook.xml");
  const rels = find("xl/_rels/workbook.xml.rels");
  if (workbook && rels) {
    const firstId = read(zip, workbook).match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
    const target = firstId ? read(zip, rels).match(new RegExp(`<Relationship\\b[^>]*Id="${firstId}"[^>]*Target="([^"]+)"`))?.[1] ?? read(zip, rels).match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${firstId}"`))?.[1] : undefined;
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = (sheetPath && find(sheetPath)) || all.filter((e) => /^xl\/worksheets\/[^/]+\.xml$/.test(e.name)).sort((a, b) => a.name.localeCompare(b.name))[0];
  if (!sheet) throw new Error("This Excel file has no worksheet.");

  const rows: string[][] = [];
  for (const row of read(zip, sheet).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    if (rows.length >= MAX_ROWS) break;
    const cells: string[] = [];
    for (const cell of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cell[1];
      const body = cell[2] ?? "";
      const ref = attrs.match(/\br="([A-Z]+\d+)"/i)?.[1];
      const type = attrs.match(/\bt="([^"]+)"/)?.[1];
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (type === "s" && v !== undefined) value = strings[Number(v)] ?? "";
      else if (type === "inlineStr") value = texts(body);
      else if (v !== undefined) value = decodeXml(v);
      const index = ref ? columnIndex(ref) : cells.length;
      while (cells.length < index) cells.push("");
      cells[index] = value.trim();
    }
    rows.push(cells);
  }
  return rows;
}
