import type { Metadata } from "next";
import Link from "next/link";
import { PromoSlot } from "@/components/merchandising/PromoSlot";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { ProductCard } from "@/components/product/ProductCard";
import { GRADING_STANDARDS, type Product } from "@/data/catalogue";
import { getCatalogue, getPackagedCatalogue, type MerchandisedPackagedProduct, type MerchandisedProduct } from "@/lib/cms";
import { B2B_CATEGORIES, CATEGORIES, CORE_CATEGORIES } from "@/data/categories";
import { INDUSTRIES } from "@/data/industries";
import { getActivePromotions } from "@/lib/promotions";

export const metadata: Metadata = {
  title: "Products",
  description:
    "Sub-base, crushed stone, sand, crusher run, ballast, drainage, decorative, lime and recycled aggregates — plus bulk cement, binders, grout and admixtures.",
};

type SearchParams = { q?: string; category?: string; grading?: string; sale?: string; sort?: string; industry?: string; group?: string };

const SORTS: Record<string, { label: string; compare?: (a: Product, b: Product) => number }> = {
  relevance: { label: "Relevance" },
  "price-asc": { label: "Price: low to high", compare: (a, b) => perTon(a) - perTon(b) },
  "price-desc": { label: "Price: high to low", compare: (a, b) => perTon(b) - perTon(a) },
  name: { label: "Name A–Z", compare: (a, b) => a.name.localeCompare(b.name) },
};

/** Comparable retail price per ton, including for bag-only products. */
function perTon(product: Product): number {
  const retail = product.prices.RETAIL;
  if (retail.ton !== undefined) return retail.ton;
  if (retail.m3 !== undefined) return (retail.m3 * 1000) / product.bulkDensityKgPerM3;
  return ((retail.bag ?? 0) * 1000) / (product.bagWeightKg ?? 1);
}

/** Every word of the query must appear in the name, SKU, category, standard or description. */
function matchesSearch(product: MerchandisedProduct | MerchandisedPackagedProduct, query: string): boolean {
  const category = CATEGORIES.find((c) => c.slug === product.categorySlug)?.name ?? "";
  const haystack = [product.name, product.sku, category, product.gradingStandard, product.description].join(" ").toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

function inScope(categorySlug: string, { category, industry, group }: SearchParams): boolean {
  if (category) return categorySlug === category;
  const industryMatch = INDUSTRIES.find((i) => i.slug === industry);
  if (industryMatch) return industryMatch.relevantCategorySlugs.includes(categorySlug);
  if (group === "b2b-bulk") return B2B_CATEGORIES.some((c) => c.slug === categorySlug);
  return true;
}

function filterProducts(catalogue: MerchandisedProduct[], params: SearchParams): MerchandisedProduct[] {
  const { q, grading, sale, sort } = params;
  const filtered = catalogue.filter(
    (p) =>
      (!q || matchesSearch(p, q)) &&
      inScope(p.categorySlug, params) &&
      (!grading || p.gradingStandard === grading) &&
      (!sale || (sale === "bag" ? p.units.includes("bag") : p.units.some((u) => u !== "bag"))),
  );
  const compare = SORTS[sort ?? "relevance"]?.compare;
  return compare ? [...filtered].sort(compare) : filtered;
}

const selectClass = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-2 py-1.5 font-body text-sm";

function filterPackaged(catalogue: MerchandisedPackagedProduct[], params: SearchParams): MerchandisedPackagedProduct[] {
  // Packaged goods have no grading standard filter value or ton/m³/bag units.
  if (params.grading || params.sale === "bulk") return [];
  const filtered = catalogue.filter((p) => (!params.q || matchesSearch(p, params.q)) && inScope(p.categorySlug, params));
  return params.sort === "name" ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : filtered;
}

export default async function ProductListingPage({ searchParams }: { searchParams: SearchParams }) {
  const [catalogue, packagedCatalogue, promotions] = await Promise.all([getCatalogue(), getPackagedCatalogue(), getActivePromotions()]);
  const products = filterProducts(catalogue, searchParams);
  const packaged = filterPackaged(packagedCatalogue, searchParams);
  const total = products.length + packaged.length;
  const category = CATEGORIES.find((c) => c.slug === searchParams.category);
  const industry = category ? undefined : INDUSTRIES.find((i) => i.slug === searchParams.industry);
  const b2bGroup = !category && !industry && searchParams.group === "b2b-bulk";
  const query = searchParams.q?.trim();
  const hasFilters = Boolean(query || searchParams.category || searchParams.grading || searchParams.sale || industry || b2bGroup);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> /{" "}
        <Link href="/products" className="hover:text-seam-blue">Products</Link>
        {category && <> / {category.name}</>}
        {industry && <> / {industry.name}</>}
        {b2bGroup && <> / Bulk &amp; Infrastructure</>}
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">
        {query ? `Results for “${query}”` : (category?.name ?? industry?.name ?? (b2bGroup ? "Bulk & Infrastructure" : "All Products"))}
      </h1>
      {category && <p className="mt-1 font-body text-sm text-slate">{category.description}</p>}
      {industry && (
        <p className="mt-1 max-w-3xl font-body text-sm text-slate">
          <span className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Shop by industry · </span>
          {industry.description}
        </p>
      )}
      {category && promotions.CATEGORY_TOP_BANNER && <PromoSlot promotion={promotions.CATEGORY_TOP_BANNER} className="mt-6" />}

      <div className="mt-8 grid gap-8 md:grid-cols-[230px_1fr]">
        <aside>
          <form method="get" action="/products" className="rounded-sm border border-basalt/10 bg-white p-4">
            <p className="font-body text-sm font-semibold text-basalt">Filters</p>
            {industry && <input type="hidden" name="industry" value={industry.slug} />}
            {b2bGroup && <input type="hidden" name="group" value="b2b-bulk" />}
            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase text-slate">Search</span>
              <input name="q" type="search" defaultValue={query ?? ""} placeholder="e.g. river sand" className={selectClass} />
            </label>
            <label className="mt-4 block">
              <span className="font-mono text-[10px] uppercase text-slate">Category</span>
              <select name="category" defaultValue={searchParams.category ?? ""} className={selectClass}>
                <option value="">All categories</option>
                <optgroup label="Aggregates">
                  {CORE_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Bulk & Infrastructure">
                  {B2B_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="mt-3 block">
              <span className="font-mono text-[10px] uppercase text-slate">Grading standard</span>
              <select name="grading" defaultValue={searchParams.grading ?? ""} className={selectClass}>
                <option value="">Any</option>
                {GRADING_STANDARDS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <span className="font-mono text-[10px] uppercase text-slate">Unit of sale</span>
              <select name="sale" defaultValue={searchParams.sale ?? ""} className={selectClass}>
                <option value="">Bulk or bagged</option>
                <option value="bulk">Bulk (ton / m³)</option>
                <option value="bag">Bagged</option>
              </select>
            </label>
            <label className="mt-3 block">
              <span className="font-mono text-[10px] uppercase text-slate">Sort</span>
              <select name="sort" defaultValue={searchParams.sort ?? "relevance"} className={selectClass}>
                {Object.entries(SORTS).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="mt-4 w-full rounded-sm bg-seam-blue py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">
              Apply Filters
            </button>
            {hasFilters && (
              <Link href="/products" className="mt-2 block text-center font-body text-xs text-slate hover:text-basalt">
                Clear filters
              </Link>
            )}
          </form>
          <div className="mt-4 rounded-sm border border-basalt/10 bg-white p-4">
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
            Civil order or delivery over 100km?{" "}
            <Link href="/quote" className="font-semibold text-seam-blue hover:underline">Request a bulk quote →</Link>
          </div>
        </aside>

        <div>
          <p className="font-body text-sm text-slate">
            {total} {total === 1 ? "product" : "products"}
          </p>
          {total === 0 ? (
            <div className="mt-4 rounded-sm border border-basalt/10 bg-white p-8 text-center font-body text-sm text-slate">
              No products match these filters.{" "}
              <Link href="/products" className="text-seam-blue hover:underline">Clear filters</Link>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.sku} product={product} preferBag={searchParams.sale === "bag"} />
              ))}
              {packaged.map((product) => (
                <PackagedProductCard key={product.sku} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
