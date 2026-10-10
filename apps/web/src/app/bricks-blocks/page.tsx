import type { Metadata } from "next";
import Link from "next/link";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { WallCalculator } from "@/components/product/WallCalculator";
import { MASONRY_CATEGORIES } from "@/data/categories";
import { MASONRY_CATEGORY_CODES, MASONRY_PRODUCTS, WALLING } from "@/data/masonry";
import { getMasonryCatalogue } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Bricks, Blocks & Walling — Clay and Cement Bricks, Blocks, Lintels, DPC",
  description:
    "SANS 227 clay stock and face bricks and SANS 1215 cement bricks by the 1,000, concrete blocks, prestressed lintels, damp-proof course and air bricks — with a wall calculator, delivered palletised across South Africa.",
  alternates: { canonical: "/bricks-blocks" },
};

const count = (slug: string) => MASONRY_PRODUCTS.filter((p) => p.categorySlug === slug).length;

/** Landing page for the masonry line, CAT-19/20 (MASONRY_CATALOGUE.md); prices only where benchmarked, everything else on request. */
export default async function BricksBlocksPage() {
  const visible = await getMasonryCatalogue();
  const live = visible.filter((p) => p.units.some((u) => u.prices !== null));
  const options = WALLING.filter((p) => visible.some((v) => v.sku === p.sku)).map((p) => ({
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
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Bricks, Blocks &amp; Walling
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Bricks · blocks · lintels · DPC</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Everything the walls are built from</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            Clay and cement bricks by the 1,000, concrete blocks, lintels, damp-proof course and air bricks — ordered with the sand, cement and
            brickforce for the same walls, and delivered palletised from brickyards in our partner network.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products?group=masonry" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop bricks &amp; blocks
            </Link>
            <a href="#wall-calculator" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Work out how many
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">Shop the line</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {MASONRY_CATEGORIES.map((c) => (
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
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-basalt">Priced and ready to order</h2>
              <Link href="/products?group=masonry" className="font-body text-sm font-semibold text-seam-blue hover:underline">All walling →</Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {live.map((p) => <PackagedProductCard key={p.sku} product={p} />)}
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-basalt">Which brick?</h2>
            <p className="mt-2 font-body text-sm text-slate">
              Clay bricks are made to <strong className="text-basalt">SANS 227</strong> and graded by use; cement bricks and blocks to{" "}
              <strong className="text-basalt">SANS 1215</strong>.
            </p>
            <dl className="mt-3 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
              {[
                ["NFP", "Non-facing plaster brick — the everyday clay stock brick for walls that will be plastered."],
                ["FBS", "Face brick, standard — left unplastered; colour and texture depend on the range."],
                ["FBX", "Face brick, extra — tighter limits on size, chips and colour for fine-jointed face work."],
                ["Cement", "Concrete stock bricks and maxis — plastered walls; strength (7 or 14 MPa) depends on the maker."],
                ["Blocks", "Concrete blocks, 90 to 190 mm wide — fewer units per m²; hollow blocks can be reinforced and grouted."],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[5rem_1fr] gap-3 px-4 py-2.5">
                  <dt className="font-mono text-basalt">{k}</dt>
                  <dd className="text-slate">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-6 font-display text-base font-semibold text-basalt">How many to the square metre</h3>
            <p className="mt-1 font-body text-sm text-slate">One leaf, 10 mm joints — from the unit&apos;s face size.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-max border-collapse font-body text-sm">
                <thead>
                  <tr className="border-b border-basalt/10 text-left text-xs text-slate">
                    <th scope="col" className="py-1.5 pr-3 font-medium">Unit</th>
                    <th scope="col" className="px-2 py-1.5 font-medium">Size (mm)</th>
                    <th scope="col" className="px-2 py-1.5 text-right font-medium">Per m²</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Imperial brick (clay or cement)", "222 × 106 × 73", "52"],
                    ["Maxi brick", "290 × 140 × 90", "33"],
                    ["Concrete block", "390 × (90–190) × 190", "12.5"],
                  ].map(([u, s, n]) => (
                    <tr key={u} className="border-b border-basalt/5">
                      <th scope="row" className="py-1.5 pr-3 text-left font-normal text-basalt">{u}</th>
                      <td className="px-2 py-1.5 tabular-nums text-slate">{s}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-basalt">{n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div id="wall-calculator" className="min-w-0 scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-basalt">Work out what you need</h2>
            <p className="mt-2 font-body text-sm text-slate">Wall size to bricks or blocks, with a breakage allowance and the order rounded to how they&apos;re sold.</p>
            <div className="mt-3">
              <WallCalculator options={options} />
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: "Damp-proof course",
              text: "SANS 952 polyolefin DPC in the bed joint at floor level and under sills — 110 mm for a half-brick wall, 225 mm for a one-brick wall.",
              href: "/products?category=lintels-dpc-wall-accessories",
              cta: "Shop DPC →",
            },
            {
              title: "Lintels",
              text: "Prestressed concrete lintels over doors and windows, one per brick leaf, in lengths from 1.2 to 3.6 m — the maker's span table decides the length.",
              href: "/products?category=lintels-dpc-wall-accessories",
              cta: "Shop lintels →",
            },
            {
              title: "Brickforce & ties",
              text: "Brickforce in the bed joints and wall ties between leaves — from our steel line, on the same delivery.",
              href: "/products?category=mesh-brickforce",
              cta: "Shop brickforce →",
            },
            {
              title: "Delivered palletised",
              text: "Bricks and blocks come on the supplier's flatbed or crane truck. We confirm the slot, any delivery charge and the yard's minimum load before dispatch.",
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
            <h2 className="font-display text-lg font-bold text-basalt">Building the whole house?</h2>
            <p className="mt-1 font-body text-sm text-slate">Plan the walls stage by stage and save it to a project list — or send the lot for a quote.</p>
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
