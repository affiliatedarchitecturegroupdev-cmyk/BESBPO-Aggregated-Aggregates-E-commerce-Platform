import Link from "next/link";
import { B2B_CATEGORIES } from "@/data/categories";
import { PACKAGED_PRODUCTS } from "@/data/packaged";

/**
 * B2B Bulk & Infrastructure (CAT-10/11), trimmed to one band: bulk cement,
 * binders, grout and admixtures for ready-mix, precast and civil buyers.
 * The detail lives on /cement and the B2B product listing.
 */
export function B2BBulkSection() {
  return (
    <section className="bg-basalt px-4 py-8 text-limestone">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div className="max-w-2xl">
          <span className="font-mono text-xs uppercase tracking-widest text-ochre-gold">B2B Bulk &amp; Infrastructure</span>
          <p className="mt-1 font-body text-sm text-limestone/80">
            Bulk cement by the bulk bag or tanker, road-capping binder, structural grout and admixtures for ready-mix, precast and civil buyers.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {B2B_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/products?category=${c.slug}`}
                className="rounded-sm border border-limestone/20 px-3 py-1 font-body text-xs text-limestone/90 hover:border-ochre-gold hover:text-ochre-gold"
              >
                {c.name} · {PACKAGED_PRODUCTS.filter((p) => p.categorySlug === c.slug).length}
              </Link>
            ))}
          </div>
        </div>
        <Link
          href="/products?group=b2b-bulk"
          className="shrink-0 rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone"
        >
          Browse Bulk &amp; Infrastructure →
        </Link>
      </div>
    </section>
  );
}
