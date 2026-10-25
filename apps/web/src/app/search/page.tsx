import type { Metadata } from "next";
import Link from "next/link";
import { ProductThumb } from "@/components/product/ProductThumb";
import { CATEGORIES } from "@/data/categories";
import { INDUSTRIES } from "@/data/industries";
import { getPublishedPosts } from "@/lib/blog";
import { DEPARTMENTS } from "@/data/departments";
import { getHiddenSkus } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { searchCatalogue } from "@/lib/product-index";
import { getStaffSynonyms, logSearch } from "@/lib/search-insights";
import { SITE_PAGES } from "@/data/site-pages";

export const metadata: Metadata = { title: "Search", robots: { index: false } };


const matches = (haystack: string, words: string[]) => words.every((w) => haystack.toLowerCase().includes(w));

/** Site-wide search: every product (ranked, with its "from" price), departments, categories, industries, articles and key pages. */
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const raw = (searchParams.q ?? "").trim().slice(0, 100);
  const words = raw.toLowerCase().split(/\s+/).filter(Boolean);
  const [hidden, posts, synonyms] = words.length ? await Promise.all([getHiddenSkus(), getPublishedPosts(), getStaffSynonyms()]) : [[], [], []];
  const hiddenSet = new Set(hidden);
  // Products: the top 12 here, the rest (with filters) on the product listing.
  const found = words.length ? searchCatalogue({ query: raw, exclude: hiddenSet, pageSize: 12 }, synonyms) : null;
  const products = found?.hits ?? [];
  const departments = words.length ? DEPARTMENTS.filter((d) => matches(`${d.name} ${d.blurb}`, words)) : [];
  const categories = words.length ? CATEGORIES.filter((c) => matches(`${c.name} ${c.description}`, words)) : [];
  const industries = words.length ? INDUSTRIES.filter((i) => matches(`${i.name} ${i.description}`, words)) : [];
  const articles = posts.filter((p) => matches(`${p.title} ${p.excerpt ?? ""} ${p.bodyMarkdown}`, words));
  const pages = words.length ? SITE_PAGES.filter((p) => matches(`${p.title} ${p.keywords}`, words)) : [];
  const total = (found?.total ?? 0) + departments.length + categories.length + industries.length + articles.length + pages.length;
  // Search insights count products found: a search that finds only an article still means we don't stock it.
  if (found) logSearch(raw, found.total);

  const section = (title: string, items: { href: string; label: string; detail?: string; thumb?: { sku: string; categorySlug: string } }[]) =>
    items.length > 0 && (
      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest text-seam-blue">{title}</h2>
        <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
          {items.map((item) => (
            <li key={item.href} className="flex items-center gap-3 px-4 py-3">
              {item.thumb && <ProductThumb sku={item.thumb.sku} categorySlug={item.thumb.categorySlug} name={item.label} className="h-12 w-12 shrink-0 rounded-sm" grains={16} />}
              <div className="min-w-0">
                <Link href={item.href} className="font-body text-sm font-semibold text-basalt hover:text-seam-blue">{item.label}</Link>
                {item.detail && <p className="font-body text-xs text-slate">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Search
      </nav>
      <h1 className="mt-4 font-display text-2xl font-bold text-basalt">{raw ? `Search results for “${raw}”` : "Search"}</h1>
      <form action="/search" role="search" className="mt-6 flex gap-2">
        <label htmlFor="search-q" className="sr-only">Search</label>
        <input id="search-q" type="search" name="q" defaultValue={raw} placeholder="Products, categories, articles…" className="w-full rounded-sm border border-basalt/20 bg-white px-4 py-2 font-body text-sm" />
        <button type="submit" className="rounded-sm bg-seam-blue px-5 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">Search</button>
      </form>
      {raw && <p className="mt-6 font-body text-sm text-slate">{total} result{total === 1 ? "" : "s"}</p>}
      {found && found.corrections.length > 0 && (
        <p className="mt-1 font-body text-sm text-slate">
          Showing results for <span className="font-semibold text-basalt">{found.corrections.map((c) => c.to).join(", ")}</span> (you typed {found.corrections.map((c) => c.from).join(", ")}).
        </p>
      )}
      {section("Departments", departments.map((d) => ({ href: d.href, label: d.name, detail: d.blurb })))}
      {section(
        "Products",
        products.map((p) => ({
          href: `/products/${p.slug}`,
          label: p.name,
          thumb: { sku: p.sku, categorySlug: p.categorySlug },
          detail: `${p.categoryName} · ${p.fromPrice !== null ? `from ${formatZAR(p.fromPrice)} / ${p.fromUnit} — buy online` : "price on quote"}`,
        })),
      )}
      {found && found.total > products.length && (
        <Link href={`/products?q=${encodeURIComponent(raw)}`} className="mt-3 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">
          See all {found.total} products, with filters →
        </Link>
      )}
      {section("Categories", categories.map((c) => ({ href: `/products?category=${c.slug}`, label: c.name, detail: c.description })))}
      {section("Industries", industries.map((i) => ({ href: `/products?industry=${i.slug}`, label: i.name, detail: i.description })))}
      {section("Articles", articles.map((a) => ({ href: `/blog/${a.slug}`, label: a.title, detail: a.excerpt ?? undefined })))}
      {section("Pages", pages.map((p) => ({ href: p.href, label: p.title })))}
      {raw && total === 0 && (
        <p className="mt-6 font-body text-sm text-slate">
          No matches. Try a broader term, or <Link href="/contact" className="text-seam-blue hover:underline">talk to sales</Link> directly.
        </p>
      )}
    </div>
  );
}
