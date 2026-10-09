import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { INDUSTRIES } from "@/data/industries";
import { getPublishedPosts } from "@/lib/blog";
import { getCatalogue, getPackagedCatalogue, getSteelCatalogue } from "@/lib/cms";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

const PAGES = [
  { href: "/delivery-areas", title: "Delivery Areas & Charges", keywords: "delivery distance charges tipper province coverage km" },
  { href: "/suppliers", title: "Partner Supplier Network", keywords: "suppliers quarries partners network plants" },
  { href: "/ways-to-pay", title: "Ways to Pay", keywords: "payment card eft capitec payflex payjustnow float lulapay credit bnpl invoice" },
  { href: "/trade-accounts", title: "Trade Accounts", keywords: "trade account contractor volume civil bulk discount" },
  { href: "/reinforcing-steel", title: "Reinforcing & Structural Steel", keywords: "steel rebar reinforcing y-bar r-bar mesh brickforce tie wire cut bend structural angle tube beam" },
  { href: "/reinforcing-steel/cut-and-bend", title: "Cut & Bend to Your Bar Bending Schedule", keywords: "cut bend bbs bar bending schedule rebar fabrication shape code sans 282 steel fixing" },
  { href: "/quote", title: "Request a Quote", keywords: "quote rfq bulk civil price" },
  { href: "/faq", title: "FAQ", keywords: "questions help faq whatsapp compliance" },
  { href: "/contact", title: "Contact & Sales", keywords: "contact phone email address sales" },
];

const matches = (haystack: string, words: string[]) => words.every((w) => haystack.toLowerCase().includes(w));

/** Site-wide search: products (aggregates and packaged goods), categories, industries, articles and key pages. */
export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const raw = (searchParams.q ?? "").trim().slice(0, 100);
  const words = raw.toLowerCase().split(/\s+/).filter(Boolean);
  const [catalogue, packaged, steel, posts] = words.length ? await Promise.all([getCatalogue(), getPackagedCatalogue(), getSteelCatalogue(), getPublishedPosts()]) : [[], [], [], []];
  const categoryName = (slug: string) => CATEGORIES.find((c) => c.slug === slug)?.name ?? "";

  const products = [...catalogue, ...packaged, ...steel.map((p) => ({ ...p, description: p.description ?? p.summary }))].filter((p) =>
    matches([p.name, p.sku, categoryName(p.categorySlug), p.gradingStandard ?? "", p.description ?? ""].join(" "), words),
  );
  const categories = words.length ? CATEGORIES.filter((c) => matches(`${c.name} ${c.description}`, words)) : [];
  const industries = words.length ? INDUSTRIES.filter((i) => matches(`${i.name} ${i.description}`, words)) : [];
  const articles = posts.filter((p) => matches(`${p.title} ${p.excerpt ?? ""} ${p.bodyMarkdown}`, words));
  const pages = words.length ? PAGES.filter((p) => matches(`${p.title} ${p.keywords}`, words)) : [];
  const total = products.length + categories.length + industries.length + articles.length + pages.length;

  const section = (title: string, items: { href: string; label: string; detail?: string }[]) =>
    items.length > 0 && (
      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-widest text-seam-blue">{title}</h2>
        <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
          {items.map((item) => (
            <li key={item.href} className="px-4 py-3">
              <Link href={item.href} className="font-body text-sm font-semibold text-basalt hover:text-seam-blue">{item.label}</Link>
              {item.detail && <p className="font-body text-xs text-slate">{item.detail}</p>}
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
      {section("Products", products.map((p) => ({ href: `/products/${p.slug}`, label: p.name, detail: `${p.sku} · ${categoryName(p.categorySlug)}` })))}
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
