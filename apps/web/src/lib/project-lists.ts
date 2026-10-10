/**
 * Project lists (PROJECT_LISTS.md) — the construction take on a wishlist:
 * materials saved against a named job, grouped by build stage, with
 * quantities. Shared by server pages and client components, so it uses only
 * the static catalogue (no server-only imports).
 *
 * Estimates use today's retail list price for priced units; the pricing
 * service re-prices everything (with the customer's tier) at the cart or
 * quote, and quote-only units are flagged rather than guessed.
 */
import { PRODUCTS } from "@/data/catalogue";
import { findQuotable, isWholeUnit } from "@/data/quotable";
import { STEEL_PRODUCTS } from "@/data/steel";

export type BuildStage = "SITE_PREP" | "FOUNDATIONS" | "SLABS" | "WALLS" | "PAVING_ROADS" | "DRAINAGE" | "LANDSCAPING" | "OTHER";

/** In build order, so a list reads like the job. */
export const STAGES: { value: BuildStage; label: string; hint: string }[] = [
  { value: "SITE_PREP", label: "Site prep & earthworks", hint: "Fill, sub-base, compaction layers" },
  { value: "FOUNDATIONS", label: "Foundations", hint: "Footings, rafts, ground beams" },
  { value: "SLABS", label: "Surface beds & slabs", hint: "Floors, suspended slabs, screeds" },
  { value: "WALLS", label: "Walls & superstructure", hint: "Brickwork, columns, lintels" },
  { value: "PAVING_ROADS", label: "Paving, driveways & roads", hint: "Base course, bedding, kerbs" },
  { value: "DRAINAGE", label: "Drainage & services", hint: "Pipe bedding, French drains" },
  { value: "LANDSCAPING", label: "Landscaping", hint: "Decorative stone, garden beds" },
  { value: "OTHER", label: "Not yet sorted", hint: "Anything else" },
];
export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.value, s.label])) as Record<BuildStage, string>;

/** Where a product usually goes in the build — the starting stage when it's saved (the customer can change it). */
const CATEGORY_STAGE: Record<string, BuildStage> = {
  "sub-base-base-course": "SITE_PREP",
  "recycled-sustainable": "SITE_PREP",
  "crusher-run-road-building": "PAVING_ROADS",
  "ballast-rail": "PAVING_ROADS",
  "crushed-stone": "FOUNDATIONS",
  "sand-fine-aggregates": "WALLS",
  "cement-hydraulic-binders": "FOUNDATIONS",
  "mortars-grouts-admixtures": "WALLS",
  "ready-mix-concrete": "FOUNDATIONS",
  "reinforcing-bar": "FOUNDATIONS",
  "mesh-brickforce": "SLABS",
  "steel-fixing-accessories": "FOUNDATIONS",
  "structural-steel": "WALLS",
  "bricks-blocks": "WALLS",
  "lintels-dpc-wall-accessories": "WALLS",
  "paving-kerbs-edging": "PAVING_ROADS",
  "retaining-erosion-control": "LANDSCAPING",
  "drainage-filter": "DRAINAGE",
  "decorative-landscaping": "LANDSCAPING",
  "agricultural-industrial": "OTHER",
};
export function defaultStage(categorySlug: string): BuildStage {
  return CATEGORY_STAGE[categorySlug] ?? "OTHER";
}

export type ProjectItem = { id: string; sku: string; unit: string; quantity: number | null; stage: BuildStage; note: string | null };
export type ProjectList = {
  id: string;
  name: string;
  siteName: string | null;
  province: string | null;
  neededBy: string | null;
  notes: string | null;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
  items: ProjectItem[];
};
export type SharedProjectList = Omit<ProjectList, "id" | "shareToken" | "createdAt">;

const PRODUCT_BY_SKU = new Map(PRODUCTS.map((p) => [p.sku, p]));
const STEEL_BY_SKU = new Map(STEEL_PRODUCTS.map((p) => [p.sku, p]));
const KG: Record<string, number> = { BAG_25KG: 25, BAG_50KG: 50, BULK_BAG_1_5T: 1500, BULK_TANKER_PER_TON: 1000 };

/** Mass of one unit in kg where we know it (aggregates by density or bag weight, bags, bulk cement, steel). Ready-mix is counted in m³ instead. */
function unitMassKg(sku: string, unit: string): number | null {
  const aggregate = PRODUCT_BY_SKU.get(sku);
  if (aggregate) {
    if (unit === "ton") return 1000;
    if (unit === "m3") return aggregate.bulkDensityKgPerM3;
    if (unit === "bag") return aggregate.bagWeightKg;
  }
  const steel = STEEL_BY_SKU.get(sku)?.units.find((u) => u.unit === unit);
  if (steel) return steel.weightKg;
  return KG[unit] ?? null;
}

export type LineView = {
  item: ProjectItem;
  name: string;
  slug: string | null;
  categorySlug: string | null;
  unitLabel: string;
  units: { code: string; label: string }[];
  /** Retail list price per unit, or null when the unit is quoted. */
  unitPrice: number | null;
  lineTotal: number | null;
  massKg: number | null;
  concreteM3: number | null;
  available: boolean;
};

export function lineView(item: ProjectItem): LineView {
  const product = findQuotable(item.sku);
  const unit = product?.units.find((u) => u.code === item.unit);
  const unitPrice = unit?.retailPrice ?? null;
  const isReadyMix = product?.categorySlug === "ready-mix-concrete";
  const perUnit = isReadyMix ? null : unitMassKg(item.sku, item.unit);
  return {
    item,
    name: product?.name ?? item.sku,
    slug: product?.slug ?? null,
    categorySlug: product?.categorySlug ?? null,
    unitLabel: unit?.label ?? item.unit,
    units: product?.units.map((u) => ({ code: u.code, label: u.label })) ?? [],
    unitPrice,
    lineTotal: unitPrice !== null && item.quantity !== null ? Math.round(unitPrice * item.quantity * 100) / 100 : null,
    massKg: perUnit !== null && item.quantity !== null ? perUnit * item.quantity : null,
    concreteM3: isReadyMix && item.quantity !== null ? item.quantity : null,
    available: Boolean(product && unit),
  };
}

export type ListSummary = {
  lines: LineView[];
  estimate: number;
  pricedLines: number;
  quotedLines: number;
  missingQuantity: number;
  tonnes: number;
  concreteM3: number;
};

export function summarise(items: ProjectItem[]): ListSummary {
  const lines = items.map(lineView);
  const sum = (f: (l: LineView) => number | null) => lines.reduce((t, l) => t + (f(l) ?? 0), 0);
  return {
    lines,
    estimate: Math.round(sum((l) => l.lineTotal) * 100) / 100,
    pricedLines: lines.filter((l) => l.lineTotal !== null).length,
    quotedLines: lines.filter((l) => l.available && l.unitPrice === null).length,
    missingQuantity: lines.filter((l) => l.item.quantity === null).length,
    tonnes: Math.round(sum((l) => l.massKg) / 10) / 100,
    concreteM3: Math.round(sum((l) => l.concreteM3) * 10) / 10,
  };
}

/** The /quote page prefill for every line with a quantity (?lines=SKU~unit~qty,…). */
export function quoteHref(list: { name: string; siteName: string | null }, lines: LineView[]): string {
  const withQty = lines.filter((l) => l.available && l.item.quantity !== null);
  const params = new URLSearchParams({
    lines: withQty.map((l) => `${l.item.sku}~${l.item.unit}~${l.item.quantity}`).join(","),
    notes: `Project list: ${list.name}${list.siteName ? ` — ${list.siteName}` : ""}`.slice(0, 500),
  });
  return `/quote?${params.toString()}`;
}

export { isWholeUnit };
