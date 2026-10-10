import Link from "next/link";
import { FeaturedTabs, type FeaturedTab } from "@/components/merchandising/FeaturedTabs";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { ProductCard } from "@/components/product/ProductCard";
import { getCatalogue, getMasonryCatalogue, getPackagedCatalogue, getReadyMixCatalogue, getSteelCatalogue } from "@/lib/cms";

const PER_TAB = 4;

/**
 * Shown until staff pick featured products in the admin (Admin → Merchandising
 * → featured rank): a priced, everyday product from each part of the range.
 */
const DEFAULTS = {
  aggregates: ["river-sand-washed", "19mm-crushed-stone-dolomite", "crusher-run-0-19mm", "river-pebble"],
  cement: ["afrisam-starbuild-32-5n", "afrisam-all-purpose-42-5n", "sephaku-32", "structural-non-shrink-grout"],
  readyMix: ["ready-mix-concrete-15mpa", "ready-mix-concrete-25mpa", "ready-mix-concrete-30mpa", "ready-mix-concrete-35mpa"],
  steel: ["y10-high-tensile-rebar", "y12-high-tensile-rebar", "ref-193-reinforcing-mesh", "binding-tie-wire-1-6mm"],
  masonry: ["clay-stock-brick-nfp", "hollow-concrete-block-140mm", "bevel-paver-grey-50mm", "upvc-underground-pipe-110mm-x-6m"],
};

/** Staff-ranked products first; otherwise the defaults; never more than PER_TAB, never a hidden product. */
function pick<T extends { slug: string; featuredRank: number | null }>(catalogue: T[], defaults: string[]): T[] {
  const ranked = catalogue.filter((p) => p.featuredRank !== null).sort((a, b) => (a.featuredRank ?? 0) - (b.featuredRank ?? 0));
  if (ranked.length > 0) return ranked.slice(0, PER_TAB);
  return defaults.map((slug) => catalogue.find((p) => p.slug === slug)).filter((p): p is T => Boolean(p)).slice(0, PER_TAB);
}

const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4";

/** Featured Materials across the whole range — a tab per line, staff-curated from the admin. */
export async function FeaturedProducts() {
  const [aggregates, packaged, readyMix, steel, masonry] = await Promise.all([
    getCatalogue(),
    getPackagedCatalogue(),
    getReadyMixCatalogue(),
    getSteelCatalogue(),
    getMasonryCatalogue(),
  ]);

  const lines = [
    { tab: { key: "aggregates", label: "Aggregates", href: "/products", cta: "All aggregates" }, items: pick(aggregates, DEFAULTS.aggregates), kind: "aggregate" as const },
    { tab: { key: "cement", label: "Cement", href: "/cement", cta: "All cement" }, items: pick(packaged, DEFAULTS.cement), kind: "packaged" as const },
    { tab: { key: "ready-mix", label: "Ready-mix", href: "/ready-mix", cta: "All ready-mix" }, items: pick(readyMix, DEFAULTS.readyMix), kind: "packaged" as const },
    { tab: { key: "steel", label: "Steel", href: "/reinforcing-steel", cta: "All steel" }, items: pick(steel, DEFAULTS.steel), kind: "packaged" as const },
    { tab: { key: "masonry", label: "Bricks, paving & drainage", href: "/products?group=masonry", cta: "All masonry & precast" }, items: pick(masonry, DEFAULTS.masonry), kind: "packaged" as const },
  ].filter((l) => l.items.length > 0);
  if (lines.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-basalt">Featured Materials</h2>
        <Link href="/products" className="shrink-0 font-body text-sm text-seam-blue hover:underline">
          View all products →
        </Link>
      </div>
      <p className="mt-1 font-body text-sm text-slate">Our picks from every part of the range — priced live where a benchmark backs it.</p>
      <FeaturedTabs tabs={lines.map((l): FeaturedTab => l.tab)}>
        {lines.map((l) => (
          <div key={l.tab.key} className={grid}>
            {l.kind === "aggregate"
              ? (l.items as typeof aggregates).map((p) => <ProductCard key={p.sku} product={p} />)
              : (l.items as (typeof packaged | typeof steel | typeof masonry | typeof readyMix)[number][]).map((p) => <PackagedProductCard key={p.sku} product={p} />)}
          </div>
        ))}
      </FeaturedTabs>
    </section>
  );
}
