import { SAMPLE_PRODUCTS } from "@/data/products.sample";
import { ProductCard } from "@/components/product/ProductCard";

export function FeaturedProducts() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold text-basalt">Popular This Month</h2>
        <a href="/products" className="font-body text-sm text-seam-blue hover:underline">View all products →</a>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {SAMPLE_PRODUCTS.slice(0, 4).map((product) => (
          <ProductCard key={product.sku} product={product} />
        ))}
      </div>
    </section>
  );
}
