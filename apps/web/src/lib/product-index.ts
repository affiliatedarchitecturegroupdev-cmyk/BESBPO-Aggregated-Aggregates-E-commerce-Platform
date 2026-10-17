import { PRODUCTS } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { departmentOf } from "@/data/departments";
import { MASONRY_PRODUCTS } from "@/data/masonry";
import { PACKAGED_PRODUCTS } from "@/data/packaged";
import { READY_MIX_PRODUCTS } from "@/data/ready-mix";
import { ROOFING_PRODUCTS } from "@/data/roofing";
import { SUPPLIES_PRODUCTS } from "@/data/supplies";
import { STEEL_PRODUCTS } from "@/data/steel";
import { UNIT_LABELS } from "@/lib/pricing";

/**
 * Every product on the storefront in one flat list — aggregates, cement,
 * ready-mix, steel, masonry, paving, drainage, roofing and timber — for
 * search suggestions, department pages and the "buy online" listing.
 * `fromPrice` is the lowest retail unit price that can go straight in the
 * cart; null means every unit is quoted.
 */
export type IndexedProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  departmentSlug: string | null;
  departmentName: string | null;
  /** Brand or maker, where the catalogue names one. */
  brand: string | null;
  fromPrice: number | null;
  fromUnit: string | null;
  /** Extra words people search for (standard, family, size). */
  keywords: string;
};

type PricedUnit = { label: string; retail: number | null | undefined };

const CATEGORY_NAME = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

function entry(
  p: { sku: string; slug: string; name: string; categorySlug: string; gradingStandard: string | null },
  units: PricedUnit[],
  extra: { brand?: string | null; keywords?: (string | null | undefined)[] } = {},
): IndexedProduct {
  const priced = units.filter((u): u is { label: string; retail: number } => typeof u.retail === "number" && u.retail > 0);
  const cheapest = priced.sort((a, b) => a.retail - b.retail)[0];
  const department = departmentOf(p.categorySlug);
  return {
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    categorySlug: p.categorySlug,
    categoryName: CATEGORY_NAME.get(p.categorySlug) ?? "",
    departmentSlug: department?.slug ?? null,
    departmentName: department?.name ?? null,
    brand: extra.brand && !extra.brand.startsWith("Generic") ? extra.brand : null,
    fromPrice: cheapest?.retail ?? null,
    fromUnit: cheapest?.label ?? null,
    keywords: [p.gradingStandard, ...(extra.keywords ?? [])].filter(Boolean).join(" "),
  };
}

export const PRODUCT_INDEX: IndexedProduct[] = [
  ...PRODUCTS.map((p) => entry(p, p.units.map((u) => ({ label: UNIT_LABELS[u], retail: p.prices.RETAIL[u] })), { keywords: [p.unitOfSaleLabel] })),
  ...PACKAGED_PRODUCTS.map((p) =>
    entry(p, p.units.map((u) => ({ label: u.label, retail: u.prices?.RETAIL })), {
      brand: p.brand,
      keywords: [p.manufacturer, p.cementFamily, p.cementClass, p.cementType],
    }),
  ),
  ...READY_MIX_PRODUCTS.map((p) => entry(p, p.units.map((u) => ({ label: u.label, retail: u.prices?.RETAIL })), { keywords: [p.mixType, `${p.strengthGradeMPa} MPa`] })),
  ...STEEL_PRODUCTS.map((p) =>
    entry(p, p.units.map((u) => ({ label: u.label, retail: u.prices?.RETAIL })), { keywords: [p.steelFamily, p.steelGrade, p.sectionSize, p.summary] }),
  ),
  ...MASONRY_PRODUCTS.map((p) => entry(p, p.units.map((u) => ({ label: u.label, retail: u.prices?.RETAIL })), { keywords: [p.masonryClass, p.unitSize, p.summary] })),
  ...[...ROOFING_PRODUCTS, ...SUPPLIES_PRODUCTS].map((p) => entry(p, p.units.map((u) => ({ label: u.label, retail: u.prices?.RETAIL })), { keywords: [p.categorySlug.replace(/-/g, " "), p.summary] })),
];

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/(\d),(\d)/g, "$1.$2") // "42,5" and "42.5" are the same class
    .replace(/×/g, "x");

/**
 * Ranks products for a query: every word must appear somewhere; names that
 * start with or contain the query rank first, then priced (buy-now) items.
 */
export function searchProducts(query: string, products: IndexedProduct[] = PRODUCT_INDEX, limit = 8): IndexedProduct[] {
  const q = norm(query.trim());
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const scored: { p: IndexedProduct; score: number }[] = [];
  for (const p of products) {
    const name = norm(p.name);
    const haystack = norm([p.name, p.sku, p.categoryName, p.departmentName ?? "", p.brand ?? "", p.keywords].join(" "));
    if (!words.every((w) => haystack.includes(w))) continue;
    let score = 0;
    if (name.startsWith(q)) score += 6;
    else if (name.includes(q)) score += 4;
    score += words.filter((w) => name.includes(w)).length;
    if (p.fromPrice !== null) score += 1;
    scored.push({ p, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.p.name.length - b.p.name.length || a.p.name.localeCompare(b.p.name))
    .slice(0, limit)
    .map((s) => s.p);
}
