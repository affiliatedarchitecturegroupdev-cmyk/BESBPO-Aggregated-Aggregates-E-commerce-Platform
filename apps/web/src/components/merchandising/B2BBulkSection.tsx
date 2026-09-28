import Link from "next/link";
import { B2B_CATEGORIES } from "@/data/categories";
import { INDUSTRIES } from "@/data/industries";
import { headlineUnit, PACKAGED_PRODUCTS } from "@/data/packaged";
import { formatZAR } from "@/lib/pricing";

/**
 * The B2B Bulk & Infrastructure range (CAT-10/11) in its own section,
 * visually distinct from the core aggregate grid. Prices appear only where
 * the B2B workbook has a real benchmark.
 */
export function B2BBulkSection() {
  return (
    <section className="bg-basalt px-4 py-16 text-limestone">
      <div className="mx-auto max-w-6xl">
        <span className="font-mono text-xs uppercase tracking-widest text-ochre-gold">B2B Bulk &amp; Infrastructure</span>
        <h2 className="mt-2 font-display text-2xl font-bold">Cement, Binders &amp; Construction Chemicals</h2>
        <p className="mt-2 max-w-2xl font-body text-sm text-limestone/70">
          Beyond aggregates — bulk cement, road-capping binder, structural grout and concrete admixtures, sold by the bag,
          bulk bag, tanker load or drum for ready-mix, precast and civil infrastructure buyers.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {B2B_CATEGORIES.map((category) => {
            const products = PACKAGED_PRODUCTS.filter((p) => p.categorySlug === category.slug);
            const priced = products.flatMap((p) => (headlineUnit(p)?.prices ? [{ p, unit: headlineUnit(p)! }] : []));
            return (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className="group rounded-sm border border-limestone/15 bg-limestone/5 p-5 transition hover:border-ochre-gold"
              >
                <p className="font-body text-base font-semibold group-hover:text-ochre-gold">{category.name}</p>
                <p className="mt-2 font-body text-sm text-limestone/70">{category.description}</p>
                <p className="mt-3 font-mono text-[11px] text-limestone/60">
                  {products.length} products
                  {priced.length > 0 && ` · ${priced.map(({ p, unit }) => `${p.name.replace(/^Bulk /, "")} ${formatZAR(unit.prices!.RETAIL)}/${unit.label}`).join(" · ")}`}
                  {priced.length < products.length && " · others on request"}
                </p>
              </Link>
            );
          })}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-limestone/50">Built for</span>
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.slug}
              href={`/products?industry=${industry.slug}`}
              className="rounded-sm border border-limestone/15 px-3 py-1.5 font-body text-xs text-limestone/80 hover:border-ochre-gold hover:text-ochre-gold"
            >
              {industry.name}
            </Link>
          ))}
        </div>
        <Link
          href="/products?group=b2b-bulk"
          className="mt-8 inline-block rounded-sm bg-ochre-gold px-6 py-3 font-body text-sm font-semibold text-basalt hover:bg-limestone"
        >
          Browse Bulk &amp; Infrastructure Products →
        </Link>
      </div>
    </section>
  );
}
