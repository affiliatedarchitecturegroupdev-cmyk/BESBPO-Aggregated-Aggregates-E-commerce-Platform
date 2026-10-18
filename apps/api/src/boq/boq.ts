import { parse } from "csv-parse/sync";

/**
 * Bill of quantities upload (docs/boq-upload.md): turn a spreadsheet's rows
 * into description / quantity / unit items, and suggest the catalogue
 * product each one most likely is. Suggestions are only that — the customer
 * confirms every line before it becomes a quote request, and anything
 * unmatched goes to our team as written.
 */

export const MAX_BOQ_ITEMS = 200;
export const MAX_BOQ_BYTES = 5 * 1024 * 1024;

export type BoqItem = { row: number; description: string; quantity: number; unit: string | null };

const HEADERS = {
  description: /^(desc(ription)?|item( description)?|material|product|particulars|specification|details?)$/i,
  quantity: /^(qty|quantity|quant|qnty|no\.?|amount required)$/i,
  unit: /^(unit|units|uom|unit of measure)$/i,
};

/** A spreadsheet number as written in South Africa or elsewhere: "1 250,5", "1,250.5", "12". */
export function parseQuantity(raw: string): number | null {
  let s = raw.trim().replace(/[\s ']/g, "");
  if (!s || !/^-?[\d.,]+$/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (lastComma > -1) s = /,\d{3}$/.test(s) && s.split(",").length > 2 ? s.replace(/,/g, "") : s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : null;
}

export function csvRows(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  // Excel in South Africa often saves CSV with semicolons (the comma is the decimal mark).
  const head = clean.split("\n").slice(0, 10).join("\n");
  const delimiter = (head.match(/;/g)?.length ?? 0) > (head.match(/,/g)?.length ?? 0) ? ";" : ",";
  return parse(clean, { delimiter, relax_column_count: true, skip_empty_lines: true, trim: true }) as string[][];
}

/** Finds the description, quantity and unit columns (by header, else by what the cells hold), then reads the items. */
export function boqItems(rows: string[][]): BoqItem[] {
  let header = -1;
  let cols = { description: -1, quantity: -1, unit: -1 };
  for (let r = 0; r < Math.min(rows.length, 15) && header < 0; r++) {
    const found = { description: -1, quantity: -1, unit: -1 };
    rows[r].forEach((cell, c) => {
      for (const key of Object.keys(HEADERS) as (keyof typeof HEADERS)[]) if (found[key] < 0 && HEADERS[key].test(cell.trim())) found[key] = c;
    });
    // "Description" beats "Item" (often just the item number) when both are there.
    const desc = rows[r].findIndex((cell) => /^(desc(ription)?|item description)$/i.test(cell.trim()));
    if (desc >= 0) found.description = desc;
    if (found.description >= 0 && found.quantity >= 0) {
      header = r;
      cols = found;
    }
  }
  if (header < 0) {
    // No header row: the longest text column is the description, the first mostly-numeric column the quantity.
    const sample = rows.slice(0, 30);
    const width = Math.max(0, ...sample.map((r) => r.length));
    const textLen = Array.from({ length: width }, (_, c) => sample.reduce((n, r) => n + (parseQuantity(r[c] ?? "") === null ? (r[c] ?? "").length : 0), 0));
    const numeric = Array.from({ length: width }, (_, c) => sample.filter((r) => parseQuantity(r[c] ?? "") !== null).length);
    cols.description = textLen.indexOf(Math.max(...textLen));
    cols.quantity = numeric.findIndex((n, c) => c !== cols.description && n >= Math.max(1, sample.length / 3));
    if (cols.description < 0 || cols.quantity < 0) return [];
    const unitCol = Array.from({ length: width }, (_, c) => c).find((c) => c !== cols.description && c !== cols.quantity && sample.some((r) => /^[a-z³²/.]{1,8}$/i.test(r[c] ?? "")));
    cols.unit = unitCol ?? -1;
  }
  const items: BoqItem[] = [];
  for (let r = header + 1; r < rows.length && items.length < MAX_BOQ_ITEMS; r++) {
    const row = rows[r];
    const description = (row[cols.description] ?? "").replace(/\s+/g, " ").trim();
    const quantity = parseQuantity(row[cols.quantity] ?? "");
    if (!description || quantity === null || description.length < 2) continue;
    if (/^(sub)?total|^carried forward|^brought forward/i.test(description)) continue;
    items.push({ row: r + 1, description: description.slice(0, 300), quantity, unit: cols.unit >= 0 ? (row[cols.unit] ?? "").trim().slice(0, 20) || null : null });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Matching to the catalogue
// ---------------------------------------------------------------------------

export type CatalogueProduct = { sku: string; name: string; category: string; unitsOfSale: string[] };
export type BoqMatch = { sku: string; name: string; unitOfSale: string; unitGuessed: boolean; score: number };

const STOP = new Set(["the", "and", "of", "for", "to", "in", "with", "a", "an", "supply", "deliver", "delivery", "provide", "including", "incl", "per", "x", "mm.", "type", "grade", "class"]);
const SYNONYMS: [RegExp, string][] = [
  [/\bcrusher ?run\b/g, "crusher run"],
  [/\bg5\b/g, "g5"],
  [/\bbrick ?force\b/g, "brickforce"],
  [/\bcement\b/g, "cement"],
  [/\bplaster ?sand\b/g, "plaster sand"],
  [/\bbuilding ?sand\b/g, "building sand"],
  [/\bstone\b/g, "stone aggregate"],
  [/\b(\d+(?:[.,]\d+)?) ?mm\b/g, "$1mm"],
  [/\by(\d{1,2})\b/g, "y$1 $1mm"],
  [/\bref ?(\d{3})\b/g, "ref$1"],
];

export function tokens(text: string): string[] {
  let t = text.toLowerCase().replace(/[’']/g, "").replace(/×/g, "x");
  for (const [re, rep] of SYNONYMS) t = t.replace(re, rep);
  return t
    .split(/[^a-z0-9.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** The BOQ's unit as one of our units of sale, if it says one clearly. */
export function unitFromText(unit: string | null, description: string): string | null {
  const u = `${unit ?? ""} ${description}`.toLowerCase();
  if (/(?<![a-z])(m3|m³|cubes?|cubic)(?![a-z0-9])/.test(u)) return "BULK_M3";
  if (/\b(t|ton|tons|tonne|tonnes)\b/.test(unit?.toLowerCase() ?? "")) return "BULK_TON";
  if (/\b50 ?kg\b/.test(u)) return "BAG_50KG";
  if (/\b25 ?kg\b/.test(u)) return "BAG_25KG";
  if (/\b(bags?|pockets?)\b/.test(u)) return "BAGGED";
  if (/\b12 ?m\b/.test(u)) return "LENGTH_12M";
  if (/\b6 ?m\b/.test(u)) return "LENGTH_6M";
  if (/\b(no|nr|ea|each|units?|pcs?|pieces?)\b/.test(unit?.toLowerCase() ?? "")) return "EACH";
  return null;
}

/** The best catalogue products for one BOQ line (up to three), best first. */
export function matchItem(item: BoqItem, catalogue: { product: CatalogueProduct; tokens: Set<string> }[]): BoqMatch[] {
  const want = new Set(tokens(item.description));
  if (want.size === 0) return [];
  const unit = unitFromText(item.unit, item.description);
  const scored = catalogue.map(({ product, tokens: have }) => {
    let hit = 0;
    let weight = 0;
    for (const w of want) {
      const wt = /\d/.test(w) ? 2 : 1; // sizes and grades decide between near-identical products
      weight += wt;
      if (have.has(w)) hit += wt;
    }
    const recall = hit / weight;
    const precision = hit / Math.max(have.size, 1);
    const score = Math.round((0.75 * recall + 0.25 * precision) * 1000) / 1000;
    const unitOk = unit !== null && product.unitsOfSale.includes(unit);
    return { product, recall, score: unitOk ? score + 0.05 : score, unitOk };
  });
  // At least half of what the line says must be in the product's name — one shared word ("roof") isn't a match.
  return scored
    .filter((s) => s.recall >= 0.5 && s.score >= 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => ({
      sku: s.product.sku,
      name: s.product.name,
      unitOfSale: s.unitOk ? unit! : s.product.unitsOfSale[0],
      unitGuessed: !s.unitOk,
      score: Math.min(1, s.score),
    }));
}

export function indexCatalogue(products: CatalogueProduct[]) {
  return products.map((product) => ({ product, tokens: new Set(tokens(`${product.name} ${product.sku} ${product.category}`)) }));
}
