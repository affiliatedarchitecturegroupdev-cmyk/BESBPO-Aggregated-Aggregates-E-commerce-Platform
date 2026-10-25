import { CATEGORIES } from "@/data/categories";
import { DEPARTMENTS } from "@/data/departments";
import { SITE_PAGES } from "@/data/site-pages";
import { getHiddenSkus, getLivePrices } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { familyOfSku, searchProducts } from "@/lib/product-index";
import { getStaffSynonyms } from "@/lib/search-insights";

export type Suggestion = { kind: "product" | "category" | "department" | "page"; href: string; label: string; detail?: string; sku?: string; categorySlug?: string };

/**
 * Search-as-you-type for the header search bar: up to 8 products from the
 * catalogue search (synonyms and typo tolerance, lib/search-engine.ts; priced ones
 * show their "from" price), plus matching departments, categories and pages.
 * Hidden products never appear. Cached briefly per query. Keystrokes aren't counted in search insights —
 * only the search a shopper submits (docs/search-insights.md).
 */
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 2) return Response.json({ suggestions: [] });
  const [hiddenSkus, synonyms, live] = await Promise.all([getHiddenSkus(), getStaffSynonyms(), getLivePrices()]);
  const hidden = new Set(hiddenSkus);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => text.toLowerCase().includes(w));

  // A product that comes in several sizes shows once, saying how many — unless the search names a size.
  const bySize = /\d/.test(q);
  const seen = new Set<string>();
  const products: Suggestion[] = [];
  for (const p of searchProducts(q, hidden, 300, synonyms, live)) {
    if (products.length >= 8) break;
    const family = bySize ? null : familyOfSku(p.sku, hidden);
    if (family) {
      if (seen.has(family.key)) continue;
      seen.add(family.key);
      products.push({
        kind: "product",
        sku: p.sku,
        categorySlug: p.categorySlug,
        href: `/products/${p.slug}#sizes`,
        label: family.title,
        detail: `${family.members.length} sizes · ${family.fromPrice !== null ? `from ${formatZAR(family.fromPrice)} / ${family.fromUnit}` : "price on quote"} · ${p.categoryName}`,
      });
      continue;
    }
    products.push({
      kind: "product",
      sku: p.sku,
      categorySlug: p.categorySlug,
      href: `/products/${p.slug}`,
      label: p.name,
      detail: p.fromPrice !== null ? `From ${formatZAR(p.fromPrice)} / ${p.fromUnit} · ${p.categoryName}` : `${p.categoryName} · price on quote`,
    });
  }
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
