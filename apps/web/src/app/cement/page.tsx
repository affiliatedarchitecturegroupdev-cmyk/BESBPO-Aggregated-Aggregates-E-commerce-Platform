import type { Metadata } from "next";
import Link from "next/link";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { PACKAGED_PRODUCTS } from "@/data/packaged";

export const metadata: Metadata = {
  title: "Cement — Bagged & Bulk, Delivered Across South Africa",
  description:
    "General purpose, high-strength, masonry, road-stabilisation and precast cement from PPC, AfriSam, Afrimat, Sephaku, NPC and more — by the bag, bulk bag or tanker. SANS 50197-1 classes explained.",
  alternates: { canonical: "/cement" },
};

const CEMENT = PACKAGED_PRODUCTS.filter((p) => p.categorySlug === "cement-hydraulic-binders");
const families = [...new Set(CEMENT.flatMap((p) => (p.cementFamily ? [p.cementFamily] : [])))];
const brands = [...new Set(CEMENT.flatMap((p) => (p.brand && !p.brand.startsWith("Generic") ? [p.brand] : [])))].sort();
const live = CEMENT.filter((p) => p.units.some((u) => u.prices !== null));

const FAMILY_NOTES: Record<string, string> = {
  "General Purpose Cement": "For everyday concrete, mortar and plaster — slabs, footings, brickwork and general building.",
  "High Strength Cement": "Higher 28-day strength (typically 52,5) for structural and precast work, and where early strength matters.",
  "Road Stabilisation Cement": "For stabilising sub-base and base layers in road and civil works, to the project's specification.",
  "Masonry Cement": "For mortar and plaster in brick and block work — not for structural concrete.",
  "Precast & Concrete Products Cement": "For bricks, blocks, pavers and other precast products made at scale.",
};

const familyHref = (family: string) => `/products?category=cement-hydraulic-binders&family=${encodeURIComponent(family)}`;
const brandHref = (brand: string) => `/products?category=cement-hydraulic-binders&brand=${encodeURIComponent(brand)}`;

/** Landing page for CAT-10 cement (CEMENT_MASTER_CATALOGUE.md); prices only where benchmarked, everything else on request. */
export default function CementPage() {
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Cement
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Bag · bulk bag · tanker</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Cement for every layer of the job</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            {CEMENT.length} cements from South Africa&apos;s leading brands, from general-purpose 42,5N in 50kg bags to bulk supply for road and precast
            work — delivered with your aggregates from our partner network.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products?category=cement-hydraulic-binders" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop all cement
            </Link>
            <Link href="/ready-mix" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Need concrete instead? Ready-mix
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">Choose by use</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {families.map((f) => (
            <Link key={f} href={familyHref(f)} className="rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
              <h3 className="font-display text-base font-semibold text-basalt">{f}</h3>
              <p className="mt-1 font-body text-sm text-slate">{FAMILY_NOTES[f] ?? ""}</p>
              <p className="mt-3 font-mono text-[11px] text-seam-blue">{CEMENT.filter((p) => p.cementFamily === f).length} products →</p>
            </Link>
          ))}
        </div>

        {live.length > 0 && (
          <section className="mt-14">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-bold text-basalt">Priced and ready to order</h2>
              <Link href="/products?category=cement-hydraulic-binders" className="font-body text-sm font-semibold text-seam-blue hover:underline">All cement →</Link>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {live.slice(0, 8).map((p) => <PackagedProductCard key={p.sku} product={p} />)}
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-bold text-basalt">Reading the class on the bag</h2>
            <p className="mt-2 font-body text-sm text-slate">
              South African cements are made to <strong className="text-basalt">SANS 50197-1</strong>. The class tells you the minimum compressive strength at 28 days:
            </p>
            <dl className="mt-3 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
              {[
                ["32,5", "32.5 MPa at 28 days — mortar, plaster and lighter concrete"],
                ["42,5", "42.5 MPa — the everyday structural and general building class"],
                ["52,5", "52.5 MPa — high strength for structural, precast and demanding work"],
                ["N or R", "N is normal early strength; R is rapid (higher early strength), useful for faster formwork turnaround or cold weather"],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[5rem_1fr] gap-3 px-4 py-2.5">
                  <dt className="font-mono text-basalt">{k}</dt>
                  <dd className="text-slate">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 font-body text-xs text-slate">
              The CEM type (I to V) describes what&apos;s blended with the clinker. Your engineer&apos;s specification decides what&apos;s right for structural work.
            </p>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-basalt">Bag, bulk bag or tanker?</h2>
            <ul className="mt-3 space-y-3 font-body text-sm text-basalt">
              <li><strong>50kg bags</strong> — for most building jobs. Live prices where we hold a current benchmark.</li>
              <li><strong>1.5-ton bulk bags</strong> — for bigger pours and block yards, lifted off by crane or forklift. Quoted with the supplier.</li>
              <li><strong>Bulk tanker, per ton</strong> — for batching plants and civil works with a silo. Quoted with the supplier.</li>
            </ul>
            <p className="mt-4 font-body text-sm text-slate">
              Store bags off the ground, under cover and away from moisture, and use them within about three months of the date on the bag.
            </p>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-xl font-bold text-basalt">Shop by brand</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {brands.map((b) => (
              <Link key={b} href={brandHref(b)} className="rounded-sm border border-basalt/15 bg-white px-3 py-1.5 font-body text-sm text-basalt hover:border-seam-blue">{b}</Link>
            ))}
          </div>
        </section>

        <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-basalt">Buying by the pallet or the tanker?</h2>
            <p className="mt-1 font-body text-sm text-slate">Trade accounts get tier pricing, and volume orders are quoted with the supplier.</p>
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
