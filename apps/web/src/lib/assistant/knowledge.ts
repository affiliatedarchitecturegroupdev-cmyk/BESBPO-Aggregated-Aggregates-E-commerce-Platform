/**
 * What the rules engine knows: the store's own catalogue, pages, FAQs and
 * services — nothing else. Prices are the published retail list prices from
 * the catalogue data; a product without one is "priced on request".
 */
import { PRODUCTS } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { DESIGN_SERVICES } from "@/data/design-services";
import { FAQS, PROJECT_FAQS } from "@/data/faqs";
import { HIRE_FAQS } from "@/data/hire-faqs";
import { MASONRY_PRODUCTS } from "@/data/masonry";
import { PACKAGED_PRODUCTS } from "@/data/packaged";
import { PLANT, SERVICES } from "@/data/plant-services";
import { findQuotable, QUOTABLE, type Quotable, type QuotableUnit } from "@/data/quotable";
import { READY_MIX_PRODUCTS } from "@/data/ready-mix";
import { ROOFING_PRODUCTS } from "@/data/roofing";
import { SUPPLIES_PRODUCTS } from "@/data/supplies";
import { SITE_PAGES } from "@/data/site-pages";
import { STEEL_PRODUCTS } from "@/data/steel";
import { technicalSpec } from "@/data/technical-specs";
import { formatZAR } from "@/lib/pricing";
import { tokens } from "./text";
import type { AssistantCard } from "./types";

type Doc = { tokens: Set<string>; nameTokens: Set<string> };

export type ProductDoc = Doc & { product: Quotable; categoryName: string; uses: string[]; summary: string | null; densityKgPerM3: number | null; unitsPerM2: number | null };

const CATEGORY_NAME = Object.fromEntries(CATEGORIES.map((c) => [c.slug, c.name]));
const EXTRA: Record<string, { uses: string[]; summary: string | null; unitsPerM2?: number | null }> = Object.fromEntries([
  ...PACKAGED_PRODUCTS.map((p) => [p.sku, { uses: p.typicalUses, summary: null }]),
  ...READY_MIX_PRODUCTS.map((p) => [p.sku, { uses: p.typicalUses, summary: null }]),
  ...STEEL_PRODUCTS.map((p) => [p.sku, { uses: p.typicalUses, summary: p.summary }]),
  ...MASONRY_PRODUCTS.map((p) => [p.sku, { uses: p.typicalUses, summary: p.summary, unitsPerM2: p.unitsPerM2 }]),
  ...[...ROOFING_PRODUCTS, ...SUPPLIES_PRODUCTS].map((p) => [p.sku, { uses: p.typicalUses, summary: p.summary }]),
]);
const DENSITY = Object.fromEntries(PRODUCTS.map((p) => [p.sku, p.bulkDensityKgPerM3]));

const PRODUCT_DOCS: ProductDoc[] = QUOTABLE.map((product) => {
  const extra = EXTRA[product.sku];
  const uses = extra?.uses ?? technicalSpec(product.sku, product.categorySlug)?.typicalUses ?? [];
  const categoryName = CATEGORY_NAME[product.categorySlug] ?? "";
  const nameTokens = new Set(tokens(product.name));
  return {
    product,
    categoryName,
    uses,
    summary: extra?.summary ?? null,
    densityKgPerM3: DENSITY[product.sku] ?? null,
    unitsPerM2: extra?.unitsPerM2 ?? null,
    nameTokens,
    tokens: new Set([...nameTokens, ...tokens(product.sku.replace(/^AA-/, "")), ...tokens(categoryName), ...tokens(uses.join(" ")), ...tokens(product.gradingStandard ?? "")]),
  };
});
const DOC_BY_SKU = new Map(PRODUCT_DOCS.map((d) => [d.product.sku, d]));

export function productDoc(sku: string): ProductDoc | undefined {
  return DOC_BY_SKU.get(sku);
}

export function productBySlug(slug: string): Quotable | undefined {
  return QUOTABLE.find((q) => q.slug === slug);
}

type Scored = { d: ProductDoc; score: number; nameHits: number };

/**
 * Products scored by how well they match the words: a word in the name
 * counts three, in the category or uses one; matching every name word adds
 * two so "river sand" beats "sand". Ties go to priced products, then the
 * shorter name. Hidden products never appear.
 */
function rankProducts(words: string[], hiddenSkus: string[]): Scored[] {
  if (!words.length) return [];
  return PRODUCT_DOCS.filter((d) => !hiddenSkus.includes(d.product.sku))
    .map((d) => {
      let score = 0;
      let nameHits = 0;
      for (const w of words) {
        if (d.nameTokens.has(w)) {
          score += 3;
          nameHits++;
        } else if (d.tokens.has(w)) score += 1;
      }
      if (nameHits && nameHits === d.nameTokens.size) score += 2;
      return { d, score, nameHits };
    })
    .filter((s) => s.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.d.product.units.some((u) => u.retailPrice !== null)) - Number(a.d.product.units.some((u) => u.retailPrice !== null)) ||
        a.d.product.name.length - b.d.product.name.length,
    );
}

export function searchProducts(words: string[], hiddenSkus: string[], limit = 4, minScore = 3): ProductDoc[] {
  return rankProducts(words, hiddenSkus)
    .filter((s) => s.score >= minScore && s.nameHits > 0)
    .slice(0, limit)
    .map((s) => s.d);
}

/** The one product the words clearly name — the top match by name, ahead of the next — or null when it's ambiguous ("sand", "slab"). */
export function clearProduct(words: string[], hiddenSkus: string[]): ProductDoc | null {
  const [top, next] = rankProducts(words, hiddenSkus);
  if (!top || top.nameHits === 0 || top.score < 3) return null;
  if (next && (next.score === top.score || (next.nameHits === top.nameHits && top.nameHits < top.d.nameTokens.size))) return null;
  return top.d;
}

/** The unit a product is usually bought in: the first with a list price, else the first. */
export function headline(product: Quotable): QuotableUnit {
  return product.units.find((u) => u.retailPrice !== null && u.code !== "METRE") ?? product.units.find((u) => u.code !== "METRE") ?? product.units[0];
}

export const unitName = (u: QuotableUnit) => u.label.replace(/\s*\(.*\)$/, "");

export function priceLine(u: QuotableUnit): string | null {
  return u.retailPrice === null ? null : `${formatZAR(u.retailPrice)} / ${unitName(u)}`;
}

/** A card for a product, optionally with the quantity to add (rounded to what the unit allows) and a reason. */
export function card(product: Quotable, opts: { unit?: string; quantity?: number; note?: string } = {}): AssistantCard {
  const unit = product.units.find((u) => u.code === opts.unit) ?? headline(product);
  const whole = unit.code !== "ton" && unit.code !== "m3";
  const raw = Math.max(opts.quantity ?? product.minimumQuantity ?? 1, product.minimumQuantity ?? 0);
  const quantity = whole ? Math.ceil(raw) : Math.ceil(raw * 2) / 2;
  const label = `${quantity} × ${unitName(unit)}`;
  return {
    sku: product.sku,
    name: product.name,
    href: `/products/${product.slug}`,
    price: priceLine(unit),
    ...(opts.note ? { note: opts.note } : {}),
    ...(unit.retailPrice !== null
      ? { add: { unit: unit.code, quantity, label } }
      : { quoteHref: `/quote?${new URLSearchParams({ lines: `${product.sku}~${unit.code}~${quantity}` }).toString()}` }),
  };
}

export function visible(sku: string, hiddenSkus: string[]): Quotable | undefined {
  return hiddenSkus.includes(sku) ? undefined : findQuotable(sku);
}

// ---------------------------------------------------------------------------
// Pages, FAQs and services

type TextDoc<T> = Doc & { item: T };
const docOf = <T,>(item: T, title: string, body: string): TextDoc<T> => {
  const nameTokens = new Set(tokens(title));
  return { item, nameTokens, tokens: new Set([...nameTokens, ...tokens(body)]) };
};

const PAGE_DOCS = SITE_PAGES.map((p) => docOf(p, p.title, p.keywords));
const FAQ_DOCS = [...FAQS, ...PROJECT_FAQS, ...HIRE_FAQS].map((f) => docOf(f, f.question, f.answer));
const DESIGN_DOCS = DESIGN_SERVICES.map((s) => docOf(s, s.name, `${s.summary} ${s.whenNeeded.join(" ")} ${s.deliverables.join(" ")}`));
type HireItem = { name: string; href: string; kind: "plant" | "service" };
const HIRE_DOCS: TextDoc<HireItem>[] = [
  ...PLANT.map((p) => docOf<HireItem>({ name: p.name, href: `/plant-hire/${p.slug}`, kind: "plant" }, `${p.name} ${p.plantClass.replace("_", " ")} hire`, `${p.sizeLabel} ${p.typicalUses.join(" ")}`)),
  ...SERVICES.map((s) => docOf<HireItem>({ name: s.name, href: `/services/${s.slug}`, kind: "service" }, s.name, `${s.description} ${s.typicalUses.join(" ")}`)),
];

function rank<T>(docs: TextDoc<T>[], words: string[], minScore: number, limit: number): T[] {
  return docs
    .map((d) => ({ d, score: words.reduce((t, w) => t + (d.nameTokens.has(w) ? 3 : d.tokens.has(w) ? 1 : 0), 0) }))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.d.item);
}

export const searchPages = (words: string[], limit = 3) => rank(PAGE_DOCS, words, 3, limit);
export const searchFaqs = (words: string[], limit = 1) => rank(FAQ_DOCS, words, 4, limit);
export const searchDesign = (words: string[], limit = 3) => rank(DESIGN_DOCS, words, 3, limit);
export const searchHire = (words: string[], limit = 3) => rank(HIRE_DOCS, words, 3, limit);

export function faq(questionStart: string) {
  return [...FAQS, ...PROJECT_FAQS, ...HIRE_FAQS].find((f) => f.question.startsWith(questionStart));
}
