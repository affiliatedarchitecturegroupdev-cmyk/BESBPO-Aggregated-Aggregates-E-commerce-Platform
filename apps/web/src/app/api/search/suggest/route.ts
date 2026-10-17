import { CATEGORIES } from "@/data/categories";
import { DEPARTMENTS } from "@/data/departments";
import { SITE_PAGES } from "@/data/site-pages";
import { getHiddenSkus } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { PRODUCT_INDEX, searchProducts } from "@/lib/product-index";

export type Suggestion = { kind: "product" | "category" | "department" | "page"; href: string; label: string; detail?: string; sku?: string; categorySlug?: string };

/**
 * Search-as-you-type for the header search bar: up to 8 products (priced ones
 * show their "from" price), plus matching departments, categories and pages.
 * Hidden products never appear. Cached briefly per query.
 */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ suggestions: [] });
  const hidden = new Set(await getHiddenSkus());
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));

  const products: Suggestion[] = searchProducts(q, PRODUCT_INDEX.filter((p) => !hidden.has(p.sku))).map((p) => ({
    kind: "product",
    sku: p.sku,
    categorySlug: p.categorySlug,
    href: `/products/${p.slug}`,
    label: p.name,
    detail: p.fromPrice !== null ? `From ${formatZAR(p.fromPrice)} / ${p.fromUnit} · ${p.categoryName}` : `${p.categoryName} · price on quote`,
  }));
  const departments: Suggestion[] = DEPARTMENTS.filter((d) => has(`${d.name} ${d.blurb}`))
    .slice(0, 2)
    .map((d) => ({ kind: "department", href: d.href, label: d.name, detail: "Department" }));
  const categories: Suggestion[] = CATEGORIES.filter((c) => has(`${c.name} ${c.description}`))
    .slice(0, 3)
    .map((c) => ({ kind: "category", href: `/products?category=${c.slug}`, label: c.name, detail: "Category" }));
  const pages: Suggestion[] = SITE_PAGES.filter((p) => has(`${p.title} ${p.keywords}`))
    .slice(0, 2)
    .map((p) => ({ kind: "page", href: p.href, label: p.title, detail: "Page" }));

  return Response.json(
    { suggestions: [...departments, ...categories, ...products, ...pages] },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
