import type { Metadata } from "next";
import Link from "next/link";
import { FamilyCard } from "@/components/product/FamilyCard";
import { ListingCard } from "@/components/product/ListingCard";
import { PromoSlot } from "@/components/merchandising/PromoSlot";
import { RecentlyViewedRow } from "@/components/merchandising/RecentlyViewedRow";
import { CompareTray } from "@/components/product/CompareTray";
import { B2B_CATEGORIES, CATEGORIES, CORE_CATEGORIES, MASONRY_CATEGORIES, ROOFING_CATEGORIES, STEEL_CATEGORIES, SUPPLIES_CATEGORIES } from "@/data/categories";
import { DEPARTMENTS } from "@/data/departments";
import { INDUSTRIES } from "@/data/industries";
import { ROOF_TILE_CATEGORIES } from "@/data/masonry";
import { getHiddenSkus } from "@/lib/cms";
import { groupForListing } from "@/lib/product-families";
import { FACETS, familyView, PRODUCT_FAMILIES, PRODUCT_INDEX, searchCatalogue, type FacetKey } from "@/lib/product-index";
import { getActivePromotions } from "@/lib/promotions";
import { getStaffSynonyms, logSearch } from "@/lib/search-insights";
import { SORT_LABELS, type SortKey } from "@/lib/search-engine";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Every product in one place — aggregates, cement, ready-mix, steel, bricks, roofing, timber, plumbing, electrical, garden, tools and more — with search, filters and buy-online prices.",
};

type SearchParams = {
  q?: string;
  sort?: string;
  page?: string;
  department?: string;
  category?: string;
  availability?: string;
  sold?: string;
  brand?: string;
  standard?: string;
  /** "all" lists every size as its own card; otherwise sizes of one product are grouped (docs/product-families.md). */
  view?: string;
  /** Scopes: an industry's categories, or a catalogue line (kept for older links). */
  industry?: string;
  group?: string;
  /** Older links: grading standard and bulk/bagged. */
  grading?: string;
  sale?: string;
};

const PAGE_SIZE = 48;

const GROUPS: Record<string, { label: string; categories: string[] }> = {
  core: { label: "Aggregates & Sand", categories: CORE_CATEGORIES.map((c) => c.slug) },
  "b2b-bulk": { label: "Bulk & Infrastructure", categories: B2B_CATEGORIES.map((c) => c.slug) },
  "ready-mix": { label: "Ready-Mix Concrete", categories: ["ready-mix-concrete"] },
  steel: { label: "Reinforcing & Structural Steel", categories: STEEL_CATEGORIES.map((c) => c.slug) },
  masonry: { label: "Masonry, Paving & Retaining", categories: MASONRY_CATEGORIES.map((c) => c.slug) },
  roofing: { label: "Roofing", categories: [...ROOFING_CATEGORIES.map((c) => c.slug), ...ROOF_TILE_CATEGORIES] },
  supplies: { label: "Building Supplies", categories: SUPPLIES_CATEGORIES.map((c) => c.slug) },
};

/** URL value → the facet value the engine filters on (names for department and category, labels for the rest). */
function facetFilters(params: SearchParams): Record<FacetKey, string | undefined> {
  const department = DEPARTMENTS.find((d) => d.slug === params.department);
  const category = CATEGORIES.find((c) => c.slug === params.category);
  const sold = params.sold ?? (params.sale === "bag" ? "Bags" : params.sale === "bulk" ? "Bulk (ton / m³)" : undefined);
  return {
    department: department?.name,
    category: category?.name,
    availability: params.availability === "online" ? "Buy online" : params.availability === "quote" ? "Price on quote" : undefined,
    soldBy: sold,
    brand: params.brand,
    standard: params.standard ?? params.grading,
  };
}

/** The URL parameter and value for a facet value (the reverse of facetFilters). */
function facetParam(key: FacetKey, value: string): [keyof SearchParams, string] {
  if (key === "department") return ["department", DEPARTMENTS.find((d) => d.name === value)?.slug ?? value];
  if (key === "category") return ["category", CATEGORIES.find((c) => c.name === value)?.slug ?? value];
  if (key === "availability") return ["availability", value === "Buy online" ? "online" : "quote"];
  if (key === "soldBy") return ["sold", value];
  return [key, value];
}

const FACET_PARAM: Record<FacetKey, keyof SearchParams> = { department: "department", category: "category", availability: "availability", soldBy: "sold", brand: "brand", standard: "standard" };

/**
 * The product listing (ROADMAP 3.3 and 4.1): the whole catalogue through the catalogue search (synonyms, typo
 * tolerance), with filters that show their counts, sorting, 48 products a page, Buy online and Quote badges,
 * quick add-to-cart and compare. Older links (group, grading, sale) still work.
 */
export default async function ProductListingPage({ searchParams }: { searchParams: SearchParams }) {
  const [hidden, promotions, synonyms] = await Promise.all([getHiddenSkus(), getActivePromotions({ category: searchParams.category, industry: searchParams.industry }), getStaffSynonyms()]);
  const industry = INDUSTRIES.find((i) => i.slug === searchParams.industry);
  const group = GROUPS[searchParams.group ?? ""];
  const scope = industry ? industry.relevantCategorySlugs : group?.categories;
  const exclude = new Set(hidden);
  if (scope) for (const p of PRODUCT_INDEX) if (!scope.includes(p.categorySlug)) exclude.add(p.sku);

  const query = searchParams.q?.trim().slice(0, 100) ?? "";
  const sort: SortKey = searchParams.sort && searchParams.sort in SORT_LABELS ? (searchParams.sort as SortKey) : "relevance";
  const filters = facetFilters(searchParams);
  // Sizes of one product show as one card — unless asked otherwise, or the search names a size ("38x114", "6 mm"),
  // when the shopper wants that exact product in front of them.
  const searchesForSize = /\d/.test(query);
  const grouped = searchParams.view !== "all" && !searchesForSize;
  const all = searchCatalogue({ query, filters, sort, exclude, pageSize: 10_000 }, synonyms);
  const cards = grouped ? groupForListing(all.hits, PRODUCT_FAMILIES.families, PRODUCT_FAMILIES.familyOf) : all.hits.map((product) => ({ kind: "product" as const, product }));
  const pages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(searchParams.page) || 1)), pages);
  const pageCards = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const familyCards = cards.filter((c) => c.kind === "family").length;
  const result = { ...all, page, pages };

  const category = CATEGORIES.find((c) => c.slug === searchParams.category);
  const department = DEPARTMENTS.find((d) => d.slug === searchParams.department);
  const title = query ? `Results for “${query}”` : (category?.name ?? department?.name ?? industry?.name ?? group?.label ?? "All Products");
  const active = (Object.keys(filters) as FacetKey[]).filter((k) => filters[k]);
  // Search insights (docs/search-insights.md): count the search as typed — not each filter, page or sort after it.
  if (query && page === 1 && active.length === 0 && !scope && !searchParams.sort && !searchParams.view) logSearch(query, all.total);

  /** A link to this listing with some parameters changed (and back to page 1 unless the page is what changed). */
  const href = (changes: Partial<Record<keyof SearchParams, string | undefined>>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = { ...searchParams, page: undefined, grading: undefined, sale: undefined, ...changes };
    if (searchParams.grading && !("standard" in changes)) merged.standard ??= searchParams.grading;
    if (searchParams.sale && !("sold" in changes)) merged.sold ??= filters.soldBy;
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const qs = next.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/products" className="hover:text-seam-blue">Products</Link>
        {department && <> / <Link href={department.href} className="hover:text-seam-blue">{department.name}</Link></>}
        {category && <> / {category.name}</>}
        {!category && (industry ?? group) && <> / {industry?.name ?? group?.label}</>}
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">{title}</h1>
      {category && <p className="mt-1 max-w-3xl font-body text-sm text-slate">{category.description}</p>}
      {industry && (
        <p className="mt-1 max-w-3xl font-body text-sm text-slate">
          <span className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Shop by industry · </span>
          {industry.description}
        </p>
      )}
      {result.corrections.length > 0 && (
        <p className="mt-2 font-body text-sm text-slate">
          Showing results for <span className="font-semibold text-basalt">{result.corrections.map((c) => c.to).join(", ")}</span> — you typed {result.corrections.map((c) => c.from).join(", ")}.
        </p>
      )}
      {(category || industry) && promotions.CATEGORY_TOP_BANNER && <PromoSlot promotion={promotions.CATEGORY_TOP_BANNER} className="mt-6" />}

      <div className="mt-8 grid gap-8 md:grid-cols-[240px_1fr]">
        <aside>
          <details className="rounded-sm border border-basalt/10 bg-white" open>
            <summary className="cursor-pointer px-4 py-3 font-body text-sm font-semibold text-basalt">
              Filters{active.length > 0 && ` (${active.length})`}
            </summary>
            <div className="border-t border-basalt/10 px-4 pb-4">
              <form method="get" action="/products" className="mt-3" role="search">
                {(Object.entries(searchParams) as [string, string | undefined][])
                  .filter(([k, v]) => v && !["q", "page", "grading", "sale"].includes(k))
                  .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <label className="block">
                  <span className="font-mono text-[10px] uppercase text-slate">Search</span>
                  <input name="q" type="search" defaultValue={query} placeholder="e.g. river sand, IBR, 38×114" className="mt-1 w-full rounded-sm border border-basalt/20 bg-white px-2 py-1.5 font-body text-sm" />
                </label>
              </form>
              {active.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {active.map((k) => (
                    <Link key={k} href={href({ [FACET_PARAM[k]]: undefined, ...(k === "standard" ? { grading: undefined } : {}), ...(k === "soldBy" ? { sale: undefined } : {}) })} className="rounded-full bg-seam-blue/10 px-2.5 py-1 font-body text-xs text-seam-blue hover:bg-seam-blue/20" aria-label={`Remove filter ${filters[k]}`}>
                      {filters[k]} ×
                    </Link>
                  ))}
                  <Link href={query ? `/products?q=${encodeURIComponent(query)}` : "/products"} className="px-1 py-1 font-body text-xs text-slate hover:text-basalt">
                    Clear all
                  </Link>
                </div>
              )}
              {FACETS.map(({ key, label }) => {
                const values = result.facets[key] ?? [];
                if (values.length === 0 || (values.length === 1 && !filters[key] && key !== "availability")) return null;
                const shown = values.slice(0, 8);
                const more = values.slice(8, 40);
                const item = (v: { value: string; count: number }) => {
                  const [param, value] = facetParam(key, v.value);
                  const selected = filters[key] === v.value;
                  return (
                    <li key={v.value}>
                      <Link href={href({ [param]: selected ? undefined : value })} className={`flex justify-between gap-2 py-0.5 font-body text-xs ${selected ? "font-semibold text-seam-blue" : "text-basalt hover:text-seam-blue"}`}>
                        <span className="min-w-0 truncate">{selected ? "✓ " : ""}{v.value}</span>
                        <span className="shrink-0 font-mono text-[10px] text-slate">{v.count}</span>
                      </Link>
                    </li>
                  );
                };
                return (
                  <div key={key} className="mt-4">
                    <p className="font-mono text-[10px] uppercase text-slate">{label}</p>
                    <ul className="mt-1">{shown.map(item)}</ul>
                    {more.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer font-body text-xs text-seam-blue">{more.length} more</summary>
                        <ul className="mt-1">{more.map(item)}</ul>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
          <div className="mt-4 hidden rounded-sm border border-basalt/10 bg-white p-4 md:block">
            <p className="font-mono text-[10px] uppercase text-slate">Shop by industry</p>
            <ul className="mt-2 space-y-1.5 font-body text-xs">
              {INDUSTRIES.map((i) => (
                <li key={i.slug}>
                  <Link href={`/products?industry=${i.slug}`} className={industry?.slug === i.slug ? "font-semibold text-seam-blue" : "text-basalt hover:text-seam-blue"}>
                    {i.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-4 font-body text-xs text-basalt">
            Civil order or delivery over 100 km?{" "}
            <Link href="/quote" className="font-semibold text-seam-blue hover:underline">Request a bulk quote →</Link>
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-body text-sm text-slate">
              {result.total.toLocaleString("en-ZA")} {result.total === 1 ? "product" : "products"}
              {grouped && familyCards > 0 && ` (${cards.length.toLocaleString("en-ZA")} cards — sizes shown together)`}
              {result.pages > 1 && ` · page ${result.page} of ${result.pages}`}
            </p>
            <nav className="flex flex-wrap items-center gap-1 font-body text-xs" aria-label="Sort">
              <span className="text-slate">Sort:</span>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((s) => (
                <Link key={s} href={href({ sort: s === "relevance" ? undefined : s })} aria-current={sort === s ? "true" : undefined} className={`rounded-sm px-2 py-1 ${sort === s ? "bg-basalt text-limestone" : "text-basalt hover:bg-basalt/5"}`}>
                  {SORT_LABELS[s]}
                </Link>
              ))}
            </nav>
          </div>
          {grouped && familyCards > 0 && (
            <p className="mt-3 rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 px-4 py-2.5 font-body text-sm text-basalt">
              Products that come in several sizes are shown together — every size is listed on the card.{" "}
              <Link href={href({ view: "all" })} className="font-semibold text-seam-blue hover:underline">
                Show every size separately
              </Link>
            </p>
          )}
          {searchParams.view === "all" && !searchesForSize && (
            <p className="mt-3 rounded-sm border border-basalt/10 bg-white px-4 py-2.5 font-body text-sm text-basalt">
              Showing every size as its own product.{" "}
              <Link href={href({ view: undefined })} className="font-semibold text-seam-blue hover:underline">
                Group sizes together
              </Link>
            </p>
          )}
          {result.total === 0 ? (
            <div className="mt-4 rounded-sm border border-basalt/10 bg-white p-8 text-center font-body text-sm text-slate">
              No products match{query ? ` “${query}”` : " these filters"}.{" "}
              <Link href="/products" className="text-seam-blue hover:underline">Clear filters</Link>, or{" "}
              <Link href="/quote" className="text-seam-blue hover:underline">ask us for it on a quote</Link> — we source what we don&apos;t list.
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pageCards.map((c) => {
                if (c.kind === "product") return <ListingCard key={c.product.sku} product={c.product} />;
                const family = familyView(c.family.key, exclude);
                return family ? <FamilyCard key={c.family.key} family={family} shown={c.shown} /> : null;
              })}
            </div>
          )}
          {result.pages > 1 && (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-1 font-body text-sm" aria-label="Pages">
              {result.page > 1 && <Link href={href({ page: String(result.page - 1) })} className="rounded-sm border border-basalt/20 px-3 py-1.5 hover:border-seam-blue">← Previous</Link>}
              {pageNumbers(result.page, result.pages).map((n, i) =>
                n === null ? (
                  <span key={`gap-${i}`} className="px-2 text-slate">…</span>
                ) : (
                  <Link key={n} href={href({ page: n === 1 ? undefined : String(n) })} aria-current={n === result.page ? "page" : undefined} className={`rounded-sm px-3 py-1.5 ${n === result.page ? "bg-basalt text-limestone" : "border border-basalt/20 hover:border-seam-blue"}`}>
                    {n}
                  </Link>
                ),
              )}
              {result.page < result.pages && <Link href={href({ page: String(result.page + 1) })} className="rounded-sm border border-basalt/20 px-3 py-1.5 hover:border-seam-blue">Next →</Link>}
            </nav>
          )}
        </div>
      </div>
      <RecentlyViewedRow />
      <CompareTray />
    </div>
  );
}

/** Page links: first, last, and two either side of the current page, with gaps. */
function pageNumbers(current: number, pages: number): (number | null)[] {
  const keep = new Set([1, pages, current - 2, current - 1, current, current + 1, current + 2].filter((n) => n >= 1 && n <= pages));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((n, i) => (i > 0 && n - sorted[i - 1] > 1 ? [null, n] : [n]));
}
