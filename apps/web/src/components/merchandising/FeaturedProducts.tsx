import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import { getCatalogue } from "@/lib/cms";

// Shown until staff pick featured products in the admin.
const DEFAULT_FEATURED = ["river-sand-washed", "19mm-crushed-stone-dolomite", "crusher-run-0-19mm", "river-pebble"];

export async function FeaturedProducts() {
  const catalogue = await getCatalogue();
  const ranked = catalogue
    .filter((p) => p.featuredRank !== null)
    .sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0));
  const featured = (ranked.length > 0 ? ranked : catalogue.filter((p) => DEFAULT_FEATURED.includes(p.slug))).slice(0, 8);
  if (featured.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold text-basalt">Featured Materials</h2>
        <Link href="/products" className="font-body text-sm text-seam-blue hover:underline">
          View all products →
        </Link>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {featured.map((product) => (
          <ProductCard key={product.sku} product={product} />
        ))}
      </div>
    </section>
  );
}
