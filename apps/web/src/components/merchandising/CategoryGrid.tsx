import Link from "next/link";
import { fromPricePerTon, productsInCategory } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { MaterialSwatch } from "@/components/product/MaterialSwatch";
import { formatZAR } from "@/lib/pricing";

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-bold text-basalt">Shop by Category</h2>
        <Link href="/products" className="font-body text-sm text-seam-blue hover:underline">
          All products →
        </Link>
      </div>
      <p className="mt-1 font-body text-sm text-slate">
        Nine categories, from sub-base to decorative — every price straight from our published pricing framework.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {CATEGORIES.map((category) => {
          const products = productsInCategory(category.slug);
          const from = fromPricePerTon(category.slug);
          return (
            <Link
              key={category.slug}
              href={`/products?category=${category.slug}`}
              className="group flex flex-col overflow-hidden rounded-sm border border-basalt/10 bg-white transition hover:border-seam-blue hover:shadow-sm"
            >
              <MaterialSwatch sku={category.slug} categorySlug={category.slug} className="h-20 rounded-none" grains={70} />
              <div className="flex flex-1 flex-col p-4">
                <p className="font-body text-sm font-semibold text-basalt group-hover:text-seam-blue">{category.name}</p>
                <p className="mt-1 flex-1 font-body text-xs text-slate">{category.description}</p>
                <p className="mt-3 font-mono text-[11px] text-slate">
                  {products.length} products{from !== null && <> · from {formatZAR(from)}/ton</>}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
