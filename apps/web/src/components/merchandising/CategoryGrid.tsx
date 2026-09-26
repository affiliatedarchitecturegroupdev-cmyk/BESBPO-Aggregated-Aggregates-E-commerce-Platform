import Link from "next/link";
import { CATEGORIES } from "@/data/categories";

export function CategoryGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h2 className="font-display text-2xl font-bold text-basalt">Shop by Category</h2>
      <p className="mt-1 font-body text-sm text-slate">Nine categories, full-spectrum from sub-base to decorative.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {CATEGORIES.map((category) => (
          <Link
            key={category.slug}
            href={`/products?category=${category.slug}`}
            className="group rounded-sm border border-basalt/10 bg-white p-4 transition hover:border-seam-blue hover:shadow-sm"
          >
            <p className="font-body text-sm font-semibold text-basalt group-hover:text-seam-blue">{category.name}</p>
            <p className="mt-1 font-body text-xs text-slate">{category.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
