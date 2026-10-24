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
import { buildFamilies, familyParts } from "@/lib/product-families";
import { createSearchIndex, type SearchOptions, type SearchResult } from "@/lib/search-engine";

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
  /** The unit code of the "from" price — what quick add-to-cart adds. */
  fromUnitCode: string | null;
  /** Grading or product standard (SANS, EN, ASTM…). */
  standard: string | null;
  /** Every unit of sale, with its retail price where it can be bought online. */
  units: { code: string; label: string; retail: number | null }[];
  /** How the product is mainly sold, for the "Sold by" filter. */
  soldBy: string;
  /** Extra words people search for (standard, family, size). */
  keywords: string;
};

type PricedUnit = { code: string; label: string; retail: number | null | undefined };

/** Unit codes grouped the way buyers think about them, for the "Sold by" filter. */
export function soldByGroup(code: string): string {
  if (["ton", "m3", "BULK_TON", "BULK_M3", "TONNE", "CUBIC_METRE"].includes(code)) return "Bulk (ton / m³)";
  if (["bag", "BAGGED", "BAG_25KG", "BAG_50KG"].includes(code)) return "Bags";
  if (["BULK_BAG_1_5T", "BULK_TANKER_PER_TON", "DRUM_210L", "IBC_TOTE_1000L"].includes(code)) return "Bulk bags, drums & tankers";
  if (code === "THOUSAND") return "Per 1,000";
  if (code === "SQUARE_METRE") return "Per m²";
  if (code === "KG") return "By weight (kg)";
  if (/^(LENGTH_|SHEET_\d|TIMBER_)/.test(code) || code === "METRE" || code === "LINEAR_METRE") return "By length or metre";
  if (code === "SHEET") return "By the sheet";
  if (code === "ROLL" || code === "COIL") return "Rolls & coils";
  if (code === "PACK" || code === "BUNDLE") return "Packs, boxes & bundles";
  return "Each";
}

const CATEGORY_NAME = new Map(CATEGORIES.map((c) => [c.slug, c.name]));

function entry(
  p: { sku: string; slug: string; name: string; categorySlug: string; gradingStandard: string | null },
  units: PricedUnit[],
  extra: { brand?: string | null; keywords?: (string | null | undefined)[] } = {},
): IndexedProduct {
  const priced = units.filter((u): u is { code: string; label: string; retail: number } => typeof u.retail === "number" && u.retail > 0);
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
    fromUnitCode: cheapest?.code ?? null,
    standard: p.gradingStandard,
    units: units.map((u) => ({ code: u.code, label: u.label, retail: typeof u.retail === "number" && u.retail > 0 ? u.retail : null })),
    soldBy: soldByGroup(units[0]?.code ?? "EACH"),
    keywords: [p.gradingStandard, ...(extra.keywords ?? [])].filter(Boolean).join(" "),
  };
}

export const PRODUCT_INDEX: IndexedProduct[] = [
  ...PRODUCTS.map((p) => entry(p, p.units.map((u) => ({ code: u, label: UNIT_LABELS[u], retail: p.prices.RETAIL[u] })), { keywords: [p.unitOfSaleLabel] })),
  ...PACKAGED_PRODUCTS.map((p) =>
    entry(p, p.units.map((u) => ({ code: u.unit, label: u.label, retail: u.prices?.RETAIL })), {
      brand: p.brand,
      keywords: [p.manufacturer, p.cementFamily, p.cementClass, p.cementType],
    }),
  ),
  ...READY_MIX_PRODUCTS.map((p) => entry(p, p.units.map((u) => ({ code: u.unit, label: u.label, retail: u.prices?.RETAIL })), { keywords: [p.mixType, `${p.strengthGradeMPa} MPa`] })),
  ...STEEL_PRODUCTS.map((p) =>
    entry(p, p.units.map((u) => ({ code: u.unit, label: u.label, retail: u.prices?.RETAIL })), { keywords: [p.steelFamily, p.steelGrade, p.sectionSize, p.summary] }),
  ),
  ...MASONRY_PRODUCTS.map((p) => entry(p, p.units.map((u) => ({ code: u.unit, label: u.label, retail: u.prices?.RETAIL })), { keywords: [p.masonryClass, p.unitSize, p.summary] })),
  ...[...ROOFING_PRODUCTS, ...SUPPLIES_PRODUCTS].map((p) => entry(p, p.units.map((u) => ({ code: u.unit, label: u.label, retail: u.prices?.RETAIL })), { keywords: [p.categorySlug.replace(/-/g, " "), p.summary] })),
];

/** Ranks products for a query (header suggestions, site search): the catalogue search, best matches first. */
export function searchProducts(query: string, hidden: Set<string> = new Set(), limit = 8): IndexedProduct[] {
  if (!query.trim()) return [];
  return searchCatalogue({ query, exclude: hidden, pageSize: limit }).hits;
}

/** The facets the product listing filters on, in the order the filter panel shows them. */
export const FACETS = [
  { key: "department", label: "Department" },
  { key: "category", label: "Category" },
  { key: "availability", label: "Availability" },
  { key: "soldBy", label: "Sold by" },
  { key: "brand", label: "Brand" },
  { key: "standard", label: "Standard" },
] as const;
export type FacetKey = (typeof FACETS)[number]["key"];

/**
 * The standard a product is made to, as a filterable code ("SANS 1083", "EN 1065", "COLTO") — the catalogue's
 * standard field is often a description, so only a recognised code becomes a filter value.
 */
export function standardCode(standard: string | null): string | null {
  const m = standard?.match(/\b(SANS|SABS|EN|ISO|ASTM|IEC|DIN)\s?(\d{2,5})(?:-\d+)?/i);
  if (m) return `${m[1].toUpperCase()} ${m[2]}`;
  const named = standard?.match(/\b(COLTO|TRH ?\d+|GRI-GM13|ISPM 15)\b/i);
  return named ? named[1].toUpperCase() : null;
}

type CatalogueDoc = IndexedProduct & { id: string; text: string; facets: Record<FacetKey, string | null>; price: number | null };

const CATALOGUE_INDEX = createSearchIndex<CatalogueDoc>(
  PRODUCT_INDEX.map((p) => ({
    ...p,
    id: p.sku,
    // Department names are left out: "Timber, Poles & Decking" would make every timber product match "decking".
    // Departments are a filter instead; category names stay, as they name what the product is.
    text: [p.sku, p.categoryName, p.brand, p.keywords].filter(Boolean).join(" "),
    facets: {
      department: p.departmentName,
      category: p.categoryName,
      availability: p.fromPrice !== null ? "Buy online" : "Price on quote",
      soldBy: p.soldBy,
      brand: p.brand,
      standard: standardCode(p.standard),
    },
    price: p.fromPrice,
  })),
);

/**
 * Searches, filters, sorts and pages the whole catalogue (lib/search-engine.ts): synonyms, typo tolerance and
 * facet counts. Pass the SKUs staff have hidden as `exclude`.
 */
export function searchCatalogue(options: SearchOptions): SearchResult<CatalogueDoc> {
  return CATALOGUE_INDEX.search(options);
}

/** Product families over the whole catalogue (lib/product-families.ts): same thing, different sizes, 4 or more. */
export const PRODUCT_FAMILIES = buildFamilies(PRODUCT_INDEX);

export type FamilyMember = IndexedProduct & { variant: string };
export type FamilyView = { key: string; title: string; members: FamilyMember[]; fromPrice: number | null; fromUnit: string | null; buyOnline: number };

/** A family with each member's size label, cheapest buy-online price and how many can be bought online. */
export function familyView(key: string, hidden: Set<string> = new Set()): FamilyView | null {
  const family = PRODUCT_FAMILIES.families.get(key);
  if (!family) return null;
  const members = family.members.filter((m) => !hidden.has(m.sku)).map((m) => ({ ...m, variant: familyParts(m.name).variant }));
  if (members.length === 0) return null;
  const priced = members.filter((m) => m.fromPrice !== null).sort((a, b) => a.fromPrice! - b.fromPrice!);
  return { key, title: family.title, members, fromPrice: priced[0]?.fromPrice ?? null, fromUnit: priced[0]?.fromUnit ?? null, buyOnline: priced.length };
}

/** The family a product belongs to, if any. */
export function familyOfSku(sku: string, hidden?: Set<string>): FamilyView | null {
  const key = PRODUCT_FAMILIES.familyOf.get(sku);
  return key ? familyView(key, hidden) : null;
}
