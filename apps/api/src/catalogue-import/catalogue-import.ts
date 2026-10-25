/**
 * Catalogue import (ROADMAP 2.6, docs/catalogue-import.md): reading a staff CSV / Excel file of new products and
 * checking each row. Pure, so it is unit-tested without a database.
 *
 * One row per product: name, category and unit(s) are required; SKU, brand, standard, size, description,
 * supplier code and cost are optional. A missing SKU is made from the category and name.
 */
import { UnitOfSale } from "@aggregates/database";
import { UNIT_LABEL } from "../common/format";
import { LINE_OF_GROUP, LINE_UNITS, type AddedLine } from "../pricing/added-products";
import { matchUnit, nameKey, parseAmount } from "../supplier-prices/price-list";

export const MAX_IMPORT_ROWS = 2000;
export const SKU_PATTERN = /^[A-Z0-9-]{3,60}$/;

export type ImportStatus = "NEW" | "EXISTS" | "PROBLEM";

/** One row as read and checked — stored on the import (CatalogueImport.rows) and shown in the preview. */
export type ImportRow = {
  rowNumber: number;
  name: string;
  category: string;
  categorySlug: string | null;
  categoryName: string | null;
  units: UnitOfSale[];
  sku: string | null;
  slug: string | null;
  brand: string | null;
  standard: string | null;
  size: string | null;
  description: string | null;
  supplierCode: string | null;
  cost: number | null;
  status: ImportStatus;
  /** EXISTS: the product it already is. */
  existingSku: string | null;
  problem: string | null;
};

type Column = "sku" | "name" | "category" | "unit" | "brand" | "standard" | "size" | "description" | "code" | "cost";

const HEADERS: Record<Column, RegExp> = {
  sku: /^(our\s*)?sku$|^aa\s*(sku|code)$/i,
  name: /^(product(\s*name)?|name|item(\s*name)?)$/i,
  category: /^(category|category\s*slug|department\s*category)$/i,
  unit: /^(units?|uom|units?\s*of\s*(sale|measure)|sold\s*(by|per))$/i,
  brand: /^(brand|make|manufacturer)$/i,
  standard: /^(standard|sans|grading\s*standard|spec(ification)?\s*standard)$/i,
  size: /^(size|dimensions?|unit\s*size|pack\s*size)$/i,
  description: /^(desc(ription)?|details|notes?)$/i,
  code: /^(supplier|your|item|stock|part)\s*(code|no\.?|number|sku)$/i,
  cost: /^(cost|unit\s*cost|cost\s*price|nett?(\s*price)?|supplier\s*(cost|price))$/i,
};

const clean = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim();

export type RawImportRow = Omit<ImportRow, "categorySlug" | "categoryName" | "units" | "slug" | "status" | "existingSku" | "problem"> & { unitText: string; costText: string };

/** Finds the header row by its column names (name, category and unit are required), then reads one product per row. */
export function importRows(rows: string[][]): { rows: RawImportRow[]; problem: string | null } {
  let header = -1;
  const cols = {} as Record<Column, number>;
  for (let r = 0; r < Math.min(rows.length, 15) && header < 0; r++) {
    const found = Object.fromEntries(Object.keys(HEADERS).map((k) => [k, -1])) as Record<Column, number>;
    rows[r].forEach((cell, c) => {
      const name = clean(cell).replace(/[_-]+/g, " ");
      for (const key of Object.keys(HEADERS) as Column[]) if (found[key] < 0 && HEADERS[key].test(name)) found[key] = c;
    });
    if (found.name >= 0 && found.category >= 0 && found.unit >= 0) {
      header = r;
      Object.assign(cols, found);
    }
  }
  if (header < 0) return { rows: [], problem: "Couldn't find the columns. Use the template: name, category and unit are required — one product per row." };
  const out: RawImportRow[] = [];
  for (let r = header + 1; r < rows.length; r++) {
    const cell = (c: number) => (c >= 0 ? clean(rows[r][c]) : "");
    const name = cell(cols.name);
    if (!name && !cell(cols.category) && !cell(cols.unit) && !cell(cols.sku)) continue;
    if (out.length >= MAX_IMPORT_ROWS) return { rows: [], problem: `That's more than ${MAX_IMPORT_ROWS.toLocaleString("en-ZA")} products — split the file and import it in parts.` };
    const optional = (c: number, max: number) => cell(c).slice(0, max) || null;
    out.push({
      rowNumber: r + 1,
      name: name.slice(0, 200),
      category: cell(cols.category),
      unitText: cell(cols.unit),
      sku: cell(cols.sku).toUpperCase() || null,
      brand: optional(cols.brand, 80),
      standard: optional(cols.standard, 120),
      size: optional(cols.size, 120),
      description: optional(cols.description, 2000),
      supplierCode: optional(cols.code, 80),
      costText: cell(cols.cost),
      cost: null,
    });
  }
  return { rows: out, problem: out.length ? null : "The file has the columns but no products under them." };
}

export type CategoryRef = { slug: string; name: string; catalogueGroup: string };
export type ExistingProduct = { sku: string; slug: string; name: string; categorySlug: string };

/** The units a row names ("each", "m2; roll", "6m / 12m"), matched to the units its category's line sells in. */
export function parseUnits(text: string, line: AddedLine): { units: UnitOfSale[]; problem: string | null } {
  const options = LINE_UNITS[line].map((u) => ({ unit: u, label: UNIT_LABEL[u] }));
  const parts = text.split(/[;|/]|,(?!\d)/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { units: [], problem: "Say how it's sold — the unit column is empty." };
  const units: UnitOfSale[] = [];
  for (const part of parts) {
    const unit = matchUnit(part, options) as UnitOfSale | null;
    if (!unit) return { units: [], problem: `"${part.slice(0, 30)}" isn't a unit this category sells in (${options.map((o) => o.label.replace(/^× /, "")).join(", ")}).` };
    if (!units.includes(unit)) units.push(unit);
  }
  return { units, problem: null };
}

/** Names compared for "already a product": case, spacing and punctuation don't matter ("20m" = "20 m"). */
const productKey = (categorySlug: string, name: string) => `${categorySlug}|${nameKey(name).replace(/ /g, "")}`;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/×/g, "x")
    .replace(/%/g, "pct")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90)
    .replace(/-+$/g, "");

/** A unique value: the base, or the base with -2, -3… */
function unique(base: string, taken: Set<string>, max: number) {
  let value = base.slice(0, max).replace(/-+$/, "");
  for (let n = 2; taken.has(value); n++) value = `${base.slice(0, max - String(n).length - 1).replace(/-+$/, "")}-${n}`;
  taken.add(value);
  return value;
}

/** "AA-" + the category's initials + the name, upper case — e.g. AA-GTI-SHADE-NET-80PCT-3-X-50-M. Unique. */
export function makeSku(name: string, categorySlug: string, taken: Set<string>) {
  const prefix = categorySlug
    .split("-")
    .filter((w) => w && w !== "and")
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
  return unique(`AA-${prefix}-${slugify(name).toUpperCase()}`, taken, 60);
}

export function makeSlug(name: string, taken: Set<string>) {
  return unique(slugify(name) || "product", taken, 90);
}

/**
 * Checks every row against the categories and the catalogue: NEW rows get their SKU and slug, rows that are
 * already products (same SKU, or same name in the same category) are EXISTS, and anything that can't be added
 * says why. `takenSkus` / `takenSlugs` are every SKU and slug in use; new ones are added to them.
 */
export function checkRows(
  raw: RawImportRow[],
  categories: CategoryRef[],
  existing: ExistingProduct[],
  takenSkus: Set<string>,
  takenSlugs: Set<string>,
): ImportRow[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const byName = new Map(categories.map((c) => [nameKey(c.name), c]));
  const bySku = new Map(existing.map((p) => [p.sku, p]));
  const byCategoryName = new Map(existing.map((p) => [productKey(p.categorySlug, p.name), p]));
  const seen = new Map<string, number>();

  return raw.map((r) => {
    const { unitText, costText, ...rest } = r;
    const row: ImportRow = { ...rest, categorySlug: null, categoryName: null, units: [], slug: null, status: "PROBLEM", existingSku: null, problem: null };
    const fail = (problem: string): ImportRow => ({ ...row, status: "PROBLEM", problem });
    if (costText) {
      row.cost = parseAmount(costText);
      if (row.cost === null) return fail(`The cost "${costText.slice(0, 30)}" isn't an amount — leave it blank if there isn't one.`);
    }
    if (row.name.length < 3) return fail("The product needs a name.");
    const category = bySlug.get(row.category.toLowerCase()) ?? byName.get(nameKey(row.category));
    if (!category) return fail(row.category ? `There's no category "${row.category.slice(0, 60)}" — use a category name or slug from the list.` : "Say which category it goes in.");
    row.categorySlug = category.slug;
    row.categoryName = category.name;
    const line = LINE_OF_GROUP[category.catalogueGroup];
    if (!line) return fail(`${category.name} is priced per ton or m³ from its own price bands — products can't be added to it here.`);
    const units = parseUnits(unitText, line);
    if (units.problem) return fail(units.problem);
    row.units = units.units;

    const match = (row.sku && bySku.get(row.sku)) || byCategoryName.get(productKey(category.slug, row.name));
    if (match) return { ...row, status: "EXISTS", existingSku: match.sku, sku: match.sku, slug: match.slug };
    if (row.sku && !SKU_PATTERN.test(row.sku)) return fail("A SKU can only use capital letters, digits and dashes (3 to 60).");

    const key = productKey(category.slug, row.name);
    const earlier = seen.get(key) ?? (row.sku ? seen.get(`sku|${row.sku}`) : undefined);
    if (earlier) return fail(`The same product as row ${earlier}.`);
    seen.set(key, row.rowNumber);
    if (row.sku) {
      if (takenSkus.has(row.sku)) return fail(`The SKU ${row.sku} is used by another row.`);
      seen.set(`sku|${row.sku}`, row.rowNumber);
      takenSkus.add(row.sku);
    }
    return { ...row, status: "NEW", sku: row.sku ?? makeSku(row.name, category.slug, takenSkus), slug: makeSlug(row.name, takenSlugs) };
  });
}
