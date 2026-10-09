import type { Metadata } from "next";
import Link from "next/link";
import { BarMassCalculator } from "@/components/product/BarMassCalculator";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { STEEL_CATEGORIES } from "@/data/categories";
import { BAR_MASS_KG_PER_M, STEEL_CATEGORY_CODES, STEEL_PRODUCTS } from "@/data/steel";

export const metadata: Metadata = {
  title: "Reinforcing & Structural Steel — Rebar, Mesh, Brickforce, Delivered",
  description:
    "SANS 920 Y-bar and R-bar from 8 to 40 mm, SANS 1024 welded mesh, brickforce, tie wire and fixing accessories, plus angles, tubes, beams and channels — by the length, sheet or tonne, delivered by flatbed across South Africa.",
  alternates: { canonical: "/reinforcing-steel" },
};

const live = STEEL_PRODUCTS.filter((p) => p.units.some((u) => u.prices !== null));
const count = (slug: string) => STEEL_PRODUCTS.filter((p) => p.categorySlug === slug).length;

/** Landing page for the steel line, CAT-15..18 (STEEL_CATALOGUE.md); prices only where benchmarked, everything else on request. */
export default function ReinforcingSteelPage() {
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Reinforcing &amp; Structural Steel
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Rebar · mesh · brickforce · sections</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">The steel that goes into the concrete</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            {STEEL_PRODUCTS.length} steel products from rebar and mesh to fixing accessories and structural sections — ordered with your
            cement, stone and ready-mix, and delivered by flatbed from merchants in our partner network.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products?group=steel" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop all steel
            </Link>
            <Link href="/quote" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Send a bar bending schedule
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">Shop the line</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEEL_CATEGORIES.map((c) => (
            <Link key={c.slug} href={`/products?category=${c.slug}`} className="rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
              <p className="font-mono text-[10px] text-slate">{STEEL_CATEGORY_CODES[c.slug]}</p>
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
              <Link href="/products?group=steel" className="font-body text-sm font-semibold text-seam-blue hover:underline">All steel →</Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {live.map((p) => <PackagedProductCard key={p.sku} product={p} />)}
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-basalt">Y-bar or R-bar?</h2>
            <p className="mt-2 font-body text-sm text-slate">
              South African reinforcing bar is made to <strong className="text-basalt">SANS 920</strong>.
            </p>
            <dl className="mt-3 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
              {[
                ["Y-bar", "High-tensile (450 MPa) ribbed bar — the main reinforcement in slabs, beams, columns and footings."],
                ["R-bar", "Mild-steel (250 MPa) plain round bar — bends easily; used for links, dowels and where the engineer specifies it."],
                ["Ref mesh", "SANS 1024 welded fabric. The reference is the steel area in mm² per metre — Ref 193 is about 193 mm²/m."],
                ["Brickforce", "Ladder reinforcement laid in the mortar joints of brick and block walls, as the NHBRC requires."],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[6rem_1fr] gap-3 px-4 py-2.5">
                  <dt className="font-mono text-basalt">{k}</dt>
                  <dd className="text-slate">{v}</dd>
                </div>
              ))}
            </dl>
            <h3 className="mt-6 font-display text-base font-semibold text-basalt">Mass per metre (SANS 920 nominal)</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-max border-collapse font-body text-sm">
                <thead>
                  <tr className="border-b border-basalt/10 text-left text-xs text-slate">
                    <th scope="col" className="py-1.5 pr-3 font-medium">Bar</th>
                    {Object.keys(BAR_MASS_KG_PER_M).map((d) => (
                      <th key={d} scope="col" className="px-2 py-1.5 text-right font-medium">{d} mm</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal text-slate">kg/m</th>
                    {Object.values(BAR_MASS_KG_PER_M).map((m, i) => (
                      <td key={i} className="px-2 py-1.5 text-right tabular-nums text-basalt">{m}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-basalt">Work out what you need</h2>
            <p className="mt-2 font-body text-sm text-slate">Number of bars and length each, to kilograms, tonnes and 6 m stock lengths.</p>
            <div className="mt-3">
              <BarMassCalculator />
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Stock lengths",
              text: "Y8 to Y25 in 6 m lengths, and 12 m lengths and bundles by the tonne for bigger jobs. Live prices where two retailers back a current benchmark; the rest are quoted with the merchant.",
            },
            {
              title: "Cut & bend to schedule",
              text: "Send your bar bending schedule (SANS 282 shape codes) and we price the cutting and bending with the merchant — bars arrive tagged by bar mark, ready to fix.",
            },
            {
              title: "Delivered by flatbed",
              text: "Steel travels on the merchant's flatbed or crane truck, not a tipper. We confirm the slot and any delivery charge before dispatch, and the mill certificates come with the load.",
            },
          ].map((b) => (
            <div key={b.title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-basalt">{b.title}</h3>
              <p className="mt-2 font-body text-sm text-slate">{b.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-basalt">Buying by the tonne?</h2>
            <p className="mt-1 font-body text-sm text-slate">Trade accounts get tier pricing on stock lengths, and volume and per-tonne orders are quoted with the merchant.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/trade-accounts" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">Trade accounts</Link>
            <Link href="/quote" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">Request a quote</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
