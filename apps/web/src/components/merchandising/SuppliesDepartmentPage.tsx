import Link from "next/link";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { CATEGORIES } from "@/data/categories";
import { DEPARTMENTS } from "@/data/departments";
import { ROOFING_CATEGORY_CODES } from "@/data/roofing";
import { SUPPLIES_CATEGORY_CODES } from "@/data/supplies";
import { DepartmentCollections, DepartmentGuide, DepartmentTopSellers } from "@/components/merchandising/DepartmentExtras";
import { CompareTray } from "@/components/product/CompareTray";
import { getHiddenSkus, getRoofingCatalogue, getSuppliesCatalogue } from "@/lib/cms";

/** Quote-only products shown per category before "see all" — the larger departments run to hundreds. */
const QUOTED_PER_CATEGORY = 8;

export type SuppliesDepartmentCopy = {
  departmentSlug: string;
  eyebrow: string;
  headline: string;
  intro: string;
  tips: { title: string; text: string; href?: string; cta?: string }[];
  /** Related lines elsewhere in the catalogue (e.g. ceiling insulation under roofing). */
  alsoSee?: { href: string; label: string }[];
};

/**
 * Landing page for a building-supplies department (CAT-32..56,
 * BUILDING_SUPPLIES_CATALOGUE.md, and the range expansion from CAT-57,
 * RANGE_EXPANSION.md): its categories, what's priced and ready to order, a
 * sample of what's quoted in each category, and plain advice. Prices only
 * where two retailers back them; everything else is quoted with the supplier.
 * Timber's roofing-line categories (structural timber, connectors) sit in the
 * same page.
 */
export async function SuppliesDepartmentPage({ copy }: { copy: SuppliesDepartmentCopy }) {
  const department = DEPARTMENTS.find((d) => d.slug === copy.departmentSlug)!;
  const line = department.categorySlugs.map((slug) => CATEGORIES.find((c) => c.slug === slug)!).filter((c) => c.catalogueGroup === "supplies" || c.catalogueGroup === "roofing");
  const codes = { ...ROOFING_CATEGORY_CODES, ...SUPPLIES_CATEGORY_CODES };
  const visible = [...(await getRoofingCatalogue()), ...(await getSuppliesCatalogue())];
  const hiddenSkus = await getHiddenSkus();
  const inLine = visible.filter((p) => department.categorySlugs.includes(p.categorySlug));
  const live = inLine.filter((p) => p.units.some((u) => u.prices !== null));
  const quoted = line
    .map((c) => ({ category: c, products: inLine.filter((p) => p.categorySlug === c.slug && p.units.every((u) => u.prices === null)) }))
    .filter((g) => g.products.length > 0);
  const count = (slug: string) => inLine.filter((p) => p.categorySlug === slug).length;

  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / <Link href="/departments" className="hover:text-ochre-gold">Departments</Link> / {department.name}
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">{copy.eyebrow}</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">{copy.headline}</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">{copy.intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/products?category=${line[0].slug}`} className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop {line[0].name.toLowerCase()}
            </Link>
            <Link href="/quote" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Request a quote
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-bold text-basalt">Shop the department</h2>
          <Link href={`/products?department=${department.slug}`} className="font-body text-sm font-semibold text-seam-blue hover:underline">
            Browse all {inLine.length} products with filters →
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {line.map((c) => (
            <Link key={c.slug} href={`/products?category=${c.slug}`} className="rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
              <p className="font-mono text-[10px] text-slate">{codes[c.slug]}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-basalt">{c.name}</h3>
              <p className="mt-1 font-body text-sm text-slate">{c.description}</p>
              <p className="mt-3 font-mono text-[11px] text-seam-blue">{count(c.slug)} products →</p>
            </Link>
          ))}
        </div>
        {copy.alsoSee && copy.alsoSee.length > 0 && (
          <p className="mt-4 font-body text-sm text-slate">
            Also see:{" "}
            {copy.alsoSee.map((a, i) => (
              <span key={a.href}>
                {i > 0 && " · "}
                <Link href={a.href} className="text-seam-blue hover:underline">{a.label}</Link>
              </span>
            ))}
          </p>
        )}

        <DepartmentCollections department={department} hiddenSkus={hiddenSkus} />
        <DepartmentTopSellers department={department} hiddenSkus={hiddenSkus} />

        {live.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold text-basalt">Priced and ready to order</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {live.map((p) => (
                <PackagedProductCard key={p.sku} product={p} />
              ))}
            </div>
          </section>
        )}

        {quoted.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold text-basalt">Quoted with the supplier</h2>
            <p className="mt-2 max-w-3xl font-body text-sm text-slate">
              Make, finish and stock vary from merchant to merchant, so these are priced on a quote — we confirm the exact product and price with
              you before you pay.
            </p>
            {quoted.map(({ category, products }) => (
              <div key={category.slug} className="mt-8">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-lg font-semibold text-basalt">{category.name}</h3>
                  {products.length > QUOTED_PER_CATEGORY && (
                    <Link href={`/products?category=${category.slug}`} className="shrink-0 font-body text-sm text-seam-blue hover:underline">
                      See all {products.length} →
                    </Link>
                  )}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {products.slice(0, QUOTED_PER_CATEGORY).map((p) => (
                    <PackagedProductCard key={p.sku} product={p} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        <DepartmentGuide department={department} hiddenSkus={hiddenSkus} productCount={inLine.length} pricedCount={live.length} />

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {copy.tips.map((b) => (
            <div key={b.title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-basalt">{b.title}</h3>
              <p className="mt-2 font-body text-sm text-slate">{b.text}</p>
              {b.href && (
                <Link href={b.href} className="mt-3 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">
                  {b.cta}
                </Link>
              )}
            </div>
          ))}
        </section>

        <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-basalt">Buying for a whole project?</h2>
            <p className="mt-1 font-body text-sm text-slate">
              Send us your list or bill of quantities and we&apos;ll quote it in one go — with a deposit option on larger orders and delivery with the rest of your materials.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/quote" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
              Request a quote
            </Link>
            <Link href="/ways-to-pay" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">
              Ways to pay
            </Link>
          </div>
        </section>
      </div>
      <CompareTray />
    </div>
  );
}
