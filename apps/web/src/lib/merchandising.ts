import "server-only";
import { CATEGORIES } from "@/data/categories";
import { DEPARTMENTS } from "@/data/departments";
import { cache } from "react";
import { apiCached } from "@/lib/api";
import { getAddedDates, getLivePrices } from "@/lib/cms";
import type { LivePrice } from "@/lib/live-prices";
import { liveProductIndex, PRODUCT_INDEX, searchCatalogue, type IndexedProduct } from "@/lib/product-index";

/**
 * Data for the merchandising sections (ROADMAP 3.1–3.4, docs/merchandising.md): best sellers and trending by
 * province (from paid orders, through the API — SKUs only, never counts), staff collections, and rows worked out
 * from the catalogue itself (new in store, buy online today, seasonal, under R500, AA 60/120, brands). Every
 * section returns an empty list rather than padding itself out, so a section with nothing real to show hides.
 *
 * Rows read the catalogue with live supplier prices applied (docs/supplier-prices.md), so a product staff priced
 * from a supplier's list shows its price — and counts as "buy online" — here as on its product page.
 */

/** The catalogue the rows are built from: products, by SKU, and the live prices behind them. */
export type MerchCatalogue = { products: IndexedProduct[]; bySku: Map<string, IndexedProduct>; live: LivePrice[] };

const STATIC: MerchCatalogue = { products: PRODUCT_INDEX, bySku: new Map(PRODUCT_INDEX.map((p) => [p.sku, p])), live: [] };
const bySkuCache = new WeakMap<IndexedProduct[], Map<string, IndexedProduct>>();

/** The catalogue with live supplier prices applied, once per request. */
export const getMerchCatalogue = cache(async (): Promise<MerchCatalogue> => {
  const live = await getLivePrices();
  const products = liveProductIndex(live);
  if (products === PRODUCT_INDEX) return STATIC;
  let bySku = bySkuCache.get(products);
  if (!bySku) bySkuCache.set(products, (bySku = new Map(products.map((p) => [p.sku, p]))));
  return { products, bySku, live };
});

/** The products for these SKUs, in order, leaving out hidden and unknown ones. */
function visible(skus: string[], hidden: Set<string>, cat: MerchCatalogue): IndexedProduct[] {
  return skus.flatMap((sku) => {
    const product = hidden.has(sku) ? undefined : cat.bySku.get(sku);
    return product ? [product] : [];
  });
}

/** A section shows only with at least this many real products. */
export const MIN_ROW = 4;

export async function getTopSellers(hidden: Set<string>, { province, department, limit = 12 }: { province?: string; department?: string; limit?: number } = {}): Promise<IndexedProduct[]> {
  const qs = new URLSearchParams({ days: "30", limit: "100", ...(province ? { province } : {}) });
  const [data, cat] = await Promise.all([apiCached<{ skus: string[] }>(`/merchandising/top-sellers?${qs}`, 600, ["merchandising"]), getMerchCatalogue()]);
  const products = visible(data?.skus ?? [], hidden, cat).filter((p) => !department || p.departmentSlug === department);
  return products.slice(0, limit);
}

export async function getTrendingProvinces(): Promise<string[]> {
  return (await apiCached<string[]>("/merchandising/top-sellers/provinces", 600, ["merchandising"])) ?? [];
}

export type CollectionRule = { query?: string; department?: string; category?: string; availability?: "online" | "quote"; maxPrice?: number };
export type Collection = { slug: string; title: string; subtitle: string | null; description: string | null; skus: string[]; rule: CollectionRule | null; placements: string[] };

export async function getCollections(placement: string): Promise<Collection[]> {
  return (await apiCached<Collection[]>(`/merchandising/collections?placement=${encodeURIComponent(placement)}`, 300, ["merchandising"])) ?? [];
}

export async function getCollection(slug: string): Promise<Collection | null> {
  return apiCached<Collection>(`/merchandising/collections/${encodeURIComponent(slug)}`, 300, ["merchandising"]);
}

/** A collection's products: the hand-picked ones first, in order, then the rule's matches (up to `limit`). */
export function resolveCollection(c: Collection, hidden: Set<string>, limit = 200, cat: MerchCatalogue = STATIC): { products: IndexedProduct[]; seeAll: string | null } {
  const picked = visible(c.skus, hidden, cat);
  const rule = c.rule;
  let matches: IndexedProduct[] = [];
  let seeAll: string | null = null;
  if (rule) {
    const department = DEPARTMENTS.find((d) => d.slug === rule.department);
    const category = CATEGORIES.find((x) => x.slug === rule.category);
    const result = searchCatalogue({
      query: rule.query,
      filters: {
        department: department?.name,
        category: category?.name,
        availability: rule.availability === "online" ? "Buy online" : rule.availability === "quote" ? "Price on quote" : undefined,
      },
      exclude: new Set([...hidden, ...c.skus]),
      sort: rule.maxPrice ? "price-desc" : "relevance",
      pageSize: rule.maxPrice ? 5000 : limit,
    }, [], cat.live);
    matches = rule.maxPrice ? result.hits.filter((p) => p.fromPrice !== null && p.fromPrice <= rule.maxPrice!) : result.hits;
    const qs = new URLSearchParams({
      ...(rule.query ? { q: rule.query } : {}),
      ...(department ? { department: department.slug } : {}),
      ...(category ? { category: category.slug } : {}),
      ...(rule.availability ? { availability: rule.availability } : {}),
    }).toString();
    seeAll = qs && !rule.maxPrice ? `/products?${qs}` : null;
  }
  return { products: [...picked, ...matches].slice(0, limit), seeAll };
}

/** Products added at least a week after the store's first products, newest first (none until the range grows). */
export async function getNewInStore(hidden: Set<string>, limit = 12): Promise<IndexedProduct[]> {
  const [added, cat] = await Promise.all([getAddedDates(), getMerchCatalogue()]);
  if (added.size === 0) return [];
  const first = Math.min(...[...added.values()].map((d) => d.getTime()));
  const cutoff = Math.max(first + 7 * 86_400_000, Date.now() - 60 * 86_400_000);
  const fresh = cat.products.filter((p) => !hidden.has(p.sku) && (added.get(p.sku)?.getTime() ?? 0) >= cutoff);
  // Newest first; within a day's additions, buy-online first, then spread across departments.
  return spread(
    fresh.sort((a, b) => dayOf(added.get(b.sku)!) - dayOf(added.get(a.sku)!) || Number(b.fromPrice !== null) - Number(a.fromPrice !== null)),
    limit,
  );
}
const dayOf = (d: Date) => Math.floor(d.getTime() / 86_400_000);

/** One product per department in turn, so a row isn't twelve sizes of the same pole. */
export function spread(products: IndexedProduct[], limit: number): IndexedProduct[] {
  const queues = new Map<string, IndexedProduct[]>();
  for (const p of products) {
    const key = p.departmentSlug ?? "";
    queues.set(key, [...(queues.get(key) ?? []), p]);
  }
  const out: IndexedProduct[] = [];
  while (out.length < limit && [...queues.values()].some((q) => q.length)) {
    for (const q of queues.values()) {
      const next = q.shift();
      if (next) out.push(next);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** "Buy online today": a different department each day (one with enough priced products), cheapest first. */
export function getBuyOnlineToday(hidden: Set<string>, today = new Date(), limit = 8, cat: MerchCatalogue = STATIC): { department: (typeof DEPARTMENTS)[number] | null; products: IndexedProduct[] } {
  const priced = cat.products.filter((p) => p.fromPrice !== null && !hidden.has(p.sku));
  const eligible = DEPARTMENTS.filter((d) => priced.filter((p) => p.departmentSlug === d.slug).length >= MIN_ROW);
  if (eligible.length === 0) return { department: null, products: [] };
  const department = eligible[Math.floor(today.getTime() / 86_400_000) % eligible.length];
  const products = priced.filter((p) => p.departmentSlug === department.slug).sort((a, b) => a.fromPrice! - b.fromPrice!);
  return { department, products: spreadByCategory(products, limit) };
}

function spreadByCategory(products: IndexedProduct[], limit: number) {
  const seen = new Set<string>();
  const first = products.filter((p) => !seen.has(p.categorySlug) && seen.add(p.categorySlug));
  return [...first, ...products.filter((p) => !first.includes(p))].slice(0, limit);
}

/** The season in South Africa, what it calls for, and where to shop it. */
export type Season = { key: string; title: string; blurb: string; departments: string[]; categories: string[] };
export function seasonFor(date = new Date()): Season {
  const m = date.getMonth() + 1;
  if (m === 12 || m === 1) {
    return { key: "festive", title: "Festive season: braai, pool and outdoor living", blurb: "Get the stoep, braai and pool ready before the holidays — and book deliveries early: suppliers close over the festive break.", departments: ["outdoor-living"], categories: ["braais-fireplaces", "pools-water-features", "shade-patio-cover", "outdoor-finishes-lighting"] };
  }
  if (m >= 9 && m <= 11) {
    return { key: "spring", title: "Spring planting and the summer rains", blurb: "Lawn, soil and irrigation for planting season — and waterproofing, gutters and drainage before the summer storms.", departments: ["garden-landscaping"], categories: ["instant-lawn-seed", "soils-compost-mulch", "irrigation-hoses", "waterproofing-sealants", "roof-insulation-rainwater"] };
  }
  if (m >= 2 && m <= 3) {
    return { key: "rain", title: "Rainy season: keep the water out", blurb: "Waterproofing, sealants, gutters, downpipes and drainage for the late-summer storms.", departments: ["paint-waterproofing", "drainage"], categories: ["waterproofing-sealants", "waterproofing-systems", "roof-insulation-rainwater", "pipes-fittings", "erosion-sandbags"] };
  }
  if (m >= 4 && m <= 5) {
    return { key: "autumn", title: "Before winter: insulate and seal", blurb: "Ceiling and wall insulation, draught sealing and roof repairs while the weather still holds.", departments: ["insulation-fire-acoustic"], categories: ["roof-insulation-rainwater", "thermal-insulation", "waterproofing-sealants", "ceilings-drywall"] };
  }
  return { key: "winter", title: "Winter: warm and dry", blurb: "Insulation, closed-combustion fireplaces and flues, geyser blankets and lagging — and a good time for indoor fit-out.", departments: ["insulation-fire-acoustic"], categories: ["thermal-insulation", "braais-fireplaces", "heat-pumps-hot-water", "roof-insulation-rainwater"] };
}

export function getSeasonal(hidden: Set<string>, date = new Date(), limit = 8, cat: MerchCatalogue = STATIC): { season: Season; products: IndexedProduct[] } {
  const season = seasonFor(date);
  const inSeason = cat.products.filter((p) => !hidden.has(p.sku) && season.categories.includes(p.categorySlug));
  // Buy-online first, then one per category in turn.
  const ordered = [...inSeason].sort((a, b) => Number(b.fromPrice !== null) - Number(a.fromPrice !== null));
  return { season, products: spreadByCategory(ordered, limit) };
}

/** Categories of the small things every site runs out of. */
const ESSENTIALS = ["steel-fixing-accessories", "ppe-site-safety", "site-tools", "fasteners-fixings", "waterproofing-sealants", "site-consumables", "mortars-grouts-admixtures", "power-tool-accessories", "tiling-accessories"];

export function getUnderR500(hidden: Set<string>, limit = 8, cat: MerchCatalogue = STATIC): IndexedProduct[] {
  const cheap = cat.products.filter((p) => !hidden.has(p.sku) && p.fromPrice !== null && p.fromPrice <= 500 && ESSENTIALS.includes(p.categorySlug)).sort((a, b) => a.fromPrice! - b.fromPrice!);
  return spreadByCategory(cheap, limit);
}

/**
 * Whether a unit can go on AA 60/120 express delivery — a copy of the API's rules (apps/api/src/orders/express.ts,
 * unitWeightKg), keep the two in step. The API still decides every real cart.
 */
export function expressEligible(categorySlug: string, unit: string): boolean {
  const aggregates = CATEGORIES.filter((c) => c.catalogueGroup === "core").map((c) => c.slug);
  if (aggregates.includes(categorySlug)) return unit === "bag";
  const rules: Record<string, (u: string) => boolean> = {
    "cement-hydraulic-binders": (u) => u === "BAG_25KG" || u === "BAG_50KG",
    "mortars-grouts-admixtures": (u) => u === "BAG_25KG" || u === "BAG_50KG",
    "bricks-blocks": (u) => u === "THOUSAND" || u === "EACH",
    "lintels-dpc-wall-accessories": (u) => u === "EACH" || u === "ROLL",
    "reinforcing-bar": (u) => u === "LENGTH_6M",
    "mesh-brickforce": (u) => u === "ROLL",
    "steel-fixing-accessories": (u) => ["EACH", "PACK", "ROLL", "COIL"].includes(u),
    "roof-sheeting": (u) => /^SHEET_\d/.test(u),
    "roof-flashings-fixings": (u) => u === "EACH" || u === "PACK",
    "roof-insulation-rainwater": (u) => u === "ROLL" || u === "EACH",
    "concrete-roof-tiles": (u) => u === "EACH",
  };
  return rules[categorySlug]?.(unit) ?? false;
}

export function getExpressProducts(hidden: Set<string>, limit = 8, cat: MerchCatalogue = STATIC): IndexedProduct[] {
  const eligible = cat.products.filter((p) => !hidden.has(p.sku) && p.units.some((u) => u.retail !== null && expressEligible(p.categorySlug, u.code)));
  return spreadByCategory(eligible, limit);
}

/** Brands the catalogue names, with how many products each has — text cards, no logos without permission. */
export function getBrands(hidden: Set<string>, limit = 12): { brand: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of PRODUCT_INDEX) if (p.brand && !hidden.has(p.sku)) counts.set(p.brand, (counts.get(p.brand) ?? 0) + 1);
  return [...counts].map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count || a.brand.localeCompare(b.brand)).slice(0, limit);
}
