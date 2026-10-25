/**
 * Supplier price lists (ROADMAP Phase 1, docs/supplier-prices.md): reading the rows, matching units, and the
 * suggested sell price. Pure, so it is unit-tested without a database.
 *
 * Suggested price = supplier cost × (1 + the product's standard markup) — the same rule sales quotations use
 * for a supplier's cost (docs/sales-quotes.md). Nothing goes live until staff approve it, and no price may sit
 * below cost plus the 3% minimum margin the tier discounts already respect (PRICING_POLICY.md).
 */

export const MIN_MARGIN_PERCENT = 3;
export const MAX_ROWS = 5000;

export type PriceRow = { rowNumber: number; sku: string | null; supplierCode: string | null; description: string; unit: string | null; cost: number | null; problem: string | null };

const HEADERS: Record<"sku" | "code" | "description" | "unit" | "cost", RegExp> = {
  sku: /^(our\s*)?sku$|^aa\s*(sku|code)$|^product\s*code$/i,
  code: /^(supplier|your|item|stock|part)\s*(code|no\.?|number|sku)$|^code$/i,
  description: /^(desc(ription)?|product|item|product\s*name|name)$/i,
  unit: /^(unit|uom|unit\s*of\s*(sale|measure)|per|pack\s*size|sold\s*(by|per))$/i,
  cost: /^(cost|price|unit\s*(cost|price)|cost\s*price|nett?(\s*price)?|price\s*(per\s*unit|excl?\.?\s*vat|incl?\.?\s*vat)?|rate|amount)$/i,
};

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

/** "R 1 234,50", "1,234.50", "1234.5" → 1234.5. Null when it isn't a positive amount. */
export function parseAmount(text: string): number | null {
  let t = text.replace(/[Rr]\s?|\s|ZAR/g, "");
  if (!t) return null;
  // "1.234,50" or "1234,50" (comma decimal) vs "1,234.50" (comma thousands).
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, "").replace(",", ".");
  else t = t.replace(/,/g, "");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Math.round(Number(t) * 100) / 100;
  return n > 0 ? n : null;
}

/** Reads the rows of a price list: finds the header row by its column names, then one row per product. */
export function priceRows(rows: string[][]): { rows: PriceRow[]; problem: string | null } {
  let header = -1;
  const cols: Record<keyof typeof HEADERS, number> = { sku: -1, code: -1, description: -1, unit: -1, cost: -1 };
  for (let r = 0; r < Math.min(rows.length, 15) && header < 0; r++) {
    const found: typeof cols = { sku: -1, code: -1, description: -1, unit: -1, cost: -1 };
    rows[r].forEach((cell, c) => {
      // "supplier_code" and "Supplier-code" read like "Supplier code".
      const name = clean(cell).replace(/[_-]+/g, " ");
      for (const key of Object.keys(HEADERS) as (keyof typeof HEADERS)[]) if (found[key] < 0 && HEADERS[key].test(name)) found[key] = c;
    });
    if (found.cost >= 0 && (found.description >= 0 || found.sku >= 0 || found.code >= 0)) {
      header = r;
      Object.assign(cols, found);
    }
  }
  if (header < 0) return { rows: [], problem: "Couldn't find the columns. Use the template: sku, supplier_code, description, unit, cost — one product per row." };
  const out: PriceRow[] = [];
  for (let r = header + 1; r < rows.length && out.length < MAX_ROWS; r++) {
    const row = rows[r];
    const cell = (c: number) => (c >= 0 ? clean(row[c]) : "");
    const sku = cell(cols.sku).toUpperCase() || null;
    const supplierCode = cell(cols.code) || null;
    const description = cell(cols.description);
    const costText = cell(cols.cost);
    if (!sku && !supplierCode && !description && !costText) continue;
    const cost = parseAmount(costText);
    out.push({
      rowNumber: r + 1,
      sku,
      supplierCode,
      description: (description || sku || supplierCode || "").slice(0, 300),
      unit: cell(cols.unit) || null,
      cost,
      problem: cost === null ? `No cost on this row ("${costText.slice(0, 30)}").` : null,
    });
  }
  return { rows: out, problem: out.length ? null : "The file has the columns but no products under them." };
}

export type UnitOption = { unit: string; label: string };

/** Everyday words for the units suppliers write ("ea", "per m2", "50kg") → the pricing units products are sold in. */
const ALIASES: Record<string, string[]> = {
  EACH: ["each", "ea", "item", "unit", "no", "nr", "pc", "pcs", "piece", "per item", "per unit", "x item"],
  SQUARE_METRE: ["m2", "m²", "sqm", "sq m", "per m2", "per m²", "square metre", "square meter"],
  LINEAR_METRE: ["lm", "m", "metre", "meter", "per metre", "per meter", "per m", "linear metre", "running metre"],
  METRE: ["m", "metre", "meter", "per metre", "per m", "cut to length"],
  CUBIC_METRE: ["m3", "m³", "cube", "cubic metre"],
  KG: ["kg", "per kg", "kilogram"],
  TONNE: ["t", "ton", "tonne", "per ton", "per tonne"],
  BAG_50KG: ["50kg", "50 kg", "50kg bag", "bag 50kg"],
  BAG_25KG: ["25kg", "25 kg", "25kg bag", "bag 25kg"],
  THOUSAND: ["1000", "1,000", "per 1000", "per thousand", "thousand"],
  ROLL: ["roll", "rl"],
  PACK: ["pack", "pk", "box", "packet"],
  SHEET: ["sheet", "sht"],
  BUNDLE: ["bundle", "bdl"],
  COIL: ["coil"],
  LENGTH_6M: ["6m", "6 m", "6m length"],
  LENGTH_12M: ["12m", "12 m", "12m length"],
};

const norm = (s: string) => s.toLowerCase().replace(/[×x]\s+/g, "").replace(/\s+/g, " ").trim();

/**
 * The product's unit the supplier meant, or null when it can't tell. A blank unit is fine when the product is
 * sold in only one unit.
 */
export function matchUnit(text: string | null, options: UnitOption[]): string | null {
  if (!options.length) return null;
  if (!text?.trim()) return options.length === 1 ? options[0].unit : null;
  const t = norm(text);
  const direct = options.find((o) => o.unit.toLowerCase() === t || norm(o.label) === t);
  if (direct) return direct.unit;
  const hits = options.filter((o) => ALIASES[o.unit]?.includes(t));
  if (hits.length === 1) return hits[0].unit;
  // "bag" alone: fine when the product comes in one bag size.
  if (/^bags?$/.test(t)) {
    const bags = options.filter((o) => o.unit.startsWith("BAG_") || o.unit === "bag");
    if (bags.length === 1) return bags[0].unit;
  }
  return null;
}

/** Product names compared loosely: case, spacing and punctuation don't matter. */
export const nameKey = (s: string) => s.toLowerCase().replace(/×/g, "x").replace(/[^a-z0-9.]+/g, " ").trim();

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Cost plus the product's standard markup, to the cent. */
export const suggestPrice = (cost: number, markupPercent: number) => round2(cost * (1 + markupPercent / 100));

/** The lowest sell price allowed for a cost: cost plus the 3% minimum margin. */
export const minimumPrice = (cost: number) => round2(cost * (1 + MIN_MARGIN_PERCENT / 100));

/** The markup a sell price makes over its cost, as a percentage. */
export const markupOf = (price: number, cost: number) => round2((price / cost - 1) * 100);
