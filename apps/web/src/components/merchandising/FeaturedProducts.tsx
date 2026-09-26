import Link from "next/link";
import { PRODUCTS } from "@/data/catalogue";
import { ProductCard } from "@/components/product/ProductCard";

// One staple from each of the most-bought families, across bulk and bagged.
const FEATURED_SLUGS = ["river-sand-washed", "19mm-crushed-stone-dolomite", "crusher-run-0-19mm", "river-pebble"];

export function FeaturedProducts() {
  const featured = FEATURED_SLUGS.map((slug) => PRODUCTS.find((p) => p.slug === slug)!);
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
