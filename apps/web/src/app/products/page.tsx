import { ProductCard } from "@/components/product/ProductCard";
import { CATEGORIES } from "@/data/categories";
import { SAMPLE_PRODUCTS } from "@/data/products.sample";

export default function ProductListingPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const activeCategory = searchParams.category;
  const products = activeCategory
    ? SAMPLE_PRODUCTS.filter((p) => p.categorySlug === activeCategory)
    : SAMPLE_PRODUCTS;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate">Home / Products{activeCategory ? ` / ${activeCategory}` : ""}</nav>
      <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="rounded-sm border border-basalt/10 bg-white p-4">
          <p className="font-body text-sm font-semibold text-basalt">Filters</p>
          <div className="mt-4">
            <p className="font-mono text-[10px] uppercase text-slate">Category</p>
            <ul className="mt-2 space-y-1 font-body text-sm">
              <li>
                <a href="/products" className={!activeCategory ? "font-semibold text-seam-blue" : "text-basalt"}>
                  All Categories
                </a>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <a
                    href={`/products?category=${c.slug}`}
                    className={activeCategory === c.slug ? "font-semibold text-seam-blue" : "text-basalt"}
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <div>
          <div className="flex items-center justify-between">
            <p className="font-body text-sm text-slate">{products.length} products</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.sku} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
