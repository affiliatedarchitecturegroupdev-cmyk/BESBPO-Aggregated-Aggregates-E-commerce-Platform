import type { Metadata } from "next";
import Link from "next/link";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { WallCalculator } from "@/components/product/WallCalculator";
import { CATEGORIES } from "@/data/categories";
import { MASONRY_CATEGORY_CODES, MASONRY_PRODUCTS, PAVING, PAVING_CATEGORIES } from "@/data/masonry";
import { getMasonryCatalogue } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Paving & Retaining — Pavers, Slabs, Kerbs, Retaining Blocks, Gabions",
  description:
    "SANS 1058 concrete pavers, paving slabs, grass blocks, kerbs and edging, Terraforce and segmental retaining blocks, gabion baskets and mattresses — with a paving calculator and the base and bedding to lay them, delivered across South Africa.",
  alternates: { canonical: "/paving" },
};

const count = (slug: string) => MASONRY_PRODUCTS.filter((p) => p.categorySlug === slug).length;
const LINE = CATEGORIES.filter((c) => PAVING_CATEGORIES.includes(c.slug));

/** Landing page for paving and retaining, CAT-21/22 (MASONRY_CATALOGUE.md); prices only where benchmarked, everything else on request. */
export default async function PavingPage() {
  const visible = await getMasonryCatalogue();
  const live = visible.filter((p) => PAVING_CATEGORIES.includes(p.categorySlug) && p.units.some((u) => u.prices !== null));
  const options = PAVING.filter((p) => visible.some((v) => v.sku === p.sku)).map((p) => ({
    sku: p.sku,
    slug: p.slug,
    name: p.name,
    unitsPerM2: p.unitsPerM2!,
    unit: p.units[0].unit,
    price: p.units[0].prices?.RETAIL ?? null,
  }));

  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Paving &amp; Retaining
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Pavers · slabs · kerbs · retaining · gabions</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Driveways, paths and the slopes around them</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            Pavers, slabs and kerbs with the sub-base, base course and bedding sand to lay them on — and retaining blocks and gabions for the
            banks and channels. Delivered palletised from precast yards in our partner network.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products?category=paving-kerbs-edging" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop paving
            </Link>
            <a href="#paving-calculator" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Work out how many
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">Shop the line</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {LINE.map((c) => (
            <Link key={c.slug} href={`/products?category=${c.slug}`} className="rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
              <p className="font-mono text-[10px] text-slate">{MASONRY_CATEGORY_CODES[c.slug]}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-basalt">{c.name}</h3>
              <p className="mt-1 font-body text-sm text-slate">{c.description}</p>
              <p className="mt-3 font-mono text-[11px] text-seam-blue">{count(c.slug)} products →</p>
            </Link>
          ))}
        </div>

        {live.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold text-basalt">Priced and ready to order</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {live.map((p) => <PackagedProductCard key={p.sku} product={p} />)}
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-basalt">How paving goes down</h2>
            <p className="mt-2 font-body text-sm text-slate">
              Concrete paving blocks are made to <strong className="text-basalt">SANS 1058</strong>; kerbs to <strong className="text-basalt">SANS 927</strong>.
              The base does the work — the pavers only spread the load.
            </p>
            <ol className="mt-3 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
              {[
                ["Sub-base", "Compacted G7 (or what the engineer specifies) on a firm subgrade — deeper for driveways than for patios.", "/products/g7-natural-gravel-sub-base"],
                ["Base course", "Compacted crusher run or G5 over the sub-base, to level and falls.", "/products/crusher-run-0-19mm"],
                ["Edge restraint", "Kerbs or edging set in concrete first, so the paving can't creep.", "/products?category=paving-kerbs-edging"],
                ["Bedding sand", "A screeded layer of bedding sand, about 25 mm, not compacted before laying.", "/products/river-sand-washed"],
                ["Pavers & joints", "Lay tight, compact with a plate compactor, then brush jointing sand in and compact again.", "/products/bevel-paver-grey-50mm"],
              ].map(([k, v, href], i) => (
                <li key={k} className="grid grid-cols-[1.5rem_1fr] gap-3 px-4 py-2.5">
                  <span className="font-mono text-basalt">{i + 1}</span>
                  <span className="text-slate">
                    <Link href={href} className="font-semibold text-basalt hover:text-seam-blue">{k}</Link> — {v}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 font-body text-xs text-slate">
              Driveways for heavy vehicles and public roads need an engineer&apos;s layer design — order the materials to that design.
            </p>
          </div>
          <div id="paving-calculator" className="min-w-0 scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-basalt">Work out what you need</h2>
            <p className="mt-2 font-body text-sm text-slate">Area to pavers or slabs, with an allowance for cuts and breakage.</p>
            <div className="mt-3">
              <WallCalculator mode="area" options={options} />
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Retaining walls",
              text: "Plantable Terraforce blocks and closed-face segmental blocks for garden terraces and embankments — the height, batter and drainage follow the maker's tables or an engineer.",
              href: "/products?category=retaining-erosion-control",
              cta: "Shop retaining →",
            },
            {
              title: "Gabions",
              text: "Galvanised baskets and mattresses filled on site with gabion stone — for retaining walls, river banks and channel linings.",
              href: "/products/gabion-stone",
              cta: "Shop gabion stone →",
            },
            {
              title: "Delivered palletised",
              text: "Pavers, kerbs and blocks come on the supplier's flatbed or crane truck. We confirm the slot, any delivery charge and the yard's minimum load before dispatch.",
            },
          ].map((b: { title: string; text: string; href?: string; cta?: string }) => (
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
            <h2 className="font-display text-lg font-bold text-basalt">Paving the whole driveway?</h2>
            <p className="mt-1 font-body text-sm text-slate">See everything for the stage — base, bedding, pavers and kerbs, plus the roller and water truck — and save it to a project list.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop-by-stage" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">Shop by build stage</Link>
            <Link href="/quote" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">Request a quote</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
