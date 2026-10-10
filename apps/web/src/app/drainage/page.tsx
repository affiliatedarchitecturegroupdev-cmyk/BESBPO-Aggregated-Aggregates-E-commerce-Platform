import type { Metadata } from "next";
import Link from "next/link";
import { FrenchDrainCalculator } from "@/components/product/FrenchDrainCalculator";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { CATEGORIES } from "@/data/categories";
import { DRAINAGE_CATEGORIES, MASONRY_CATEGORY_CODES, MASONRY_PRODUCTS } from "@/data/masonry";
import { getCatalogue, getMasonryCatalogue } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Drainage & Membranes — Pipes, Fittings, Precast Drainage, DPM, Geotextile",
  description:
    "uPVC sewer and drain pipe and fittings, perforated subsoil drain pipe, concrete pipes, manholes and channel drains, damp-proof membrane, geotextile and weed-control fabric — with a French drain calculator and the drainage stone to go with it.",
  alternates: { canonical: "/drainage" },
};

const count = (slug: string) => MASONRY_PRODUCTS.filter((p) => p.categorySlug === slug).length;
const LINE = CATEGORIES.filter((c) => DRAINAGE_CATEGORIES.includes(c.slug));

/** Landing page for drainage and membranes, CAT-23..25 (MASONRY_CATALOGUE.md); prices only where benchmarked, everything else on request. */
export default async function DrainagePage() {
  const [visible, aggregates] = await Promise.all([getMasonryCatalogue(), getCatalogue()]);
  const live = visible.filter((p) => DRAINAGE_CATEGORIES.includes(p.categorySlug) && p.units.some((u) => u.prices !== null));
  const stones = aggregates
    .filter((p) => p.categorySlug === "drainage-filter")
    .map((p) => ({ sku: p.sku, slug: p.slug, name: p.name, densityKgPerM3: p.bulkDensityKgPerM3, pricePerTon: p.prices.RETAIL.ton ?? null }));

  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Drainage &amp; Membranes
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Pipes · fittings · precast · DPM · geotextile</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Keep the water where it belongs</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            Sewer and drain pipe with its fittings and bedding sand, French drains with the stone and geotextile to make them last, precast for
            the stormwater, and the damp-proof membrane under every surface bed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products?category=pipes-fittings" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop pipes &amp; fittings
            </Link>
            <a href="#french-drain-calculator" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Size a French drain
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">Shop the line</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
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
              {live.map((p) => (
                <PackagedProductCard key={p.sku} product={p} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-basalt">A French drain that lasts</h2>
            <p className="mt-2 font-body text-sm text-slate">
              The stone carries the water; the geotextile keeps the soil out of the stone. Skip the fabric and the drain silts up.
            </p>
            <ol className="mt-3 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white font-body text-sm">
              {[
                ["Dig to a fall", "A trench with a steady fall to the outlet — the drawings or the slope of the site set it.", "/plant-hire"],
                ["Line with geotextile", "Lay the nonwoven geotextile up both sides with enough left over to close over the top.", "/products/nonwoven-geotextile-a2-1-76m-x-100m"],
                ["Bed the pipe", "A layer of clean drainage stone, then the perforated pipe, holes or slots facing down.", "/products/perforated-subsoil-drain-pipe-110mm-x-6m"],
                ["Fill with stone", "Single-size, washed drainage stone around and over the pipe.", "/products/french-drain-stone"],
                ["Close and cover", "Wrap the fabric over the top with a lap, then topsoil, decorative stone or paving.", "/products?category=decorative-landscaping"],
              ].map(([k, v, href], i) => (
                <li key={k} className="grid grid-cols-[1.5rem_1fr] gap-3 px-4 py-2.5">
                  <span className="font-mono text-basalt">{i + 1}</span>
                  <span className="text-slate">
                    <Link href={href} className="font-semibold text-basalt hover:text-seam-blue">
                      {k}
                    </Link>{" "}
                    — {v}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 font-body text-xs text-slate">
              House sewer and stormwater drains follow SANS 10400-P and the local authority&apos;s connection rules — use a registered plumber for
              the connection.
            </p>
          </div>
          <div id="french-drain-calculator" className="min-w-0 scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-basalt">Work out what you need</h2>
            <p className="mt-2 font-body text-sm text-slate">Trench size to pipe lengths, stone tonnage and geotextile rolls.</p>
            <div className="mt-3">
              <FrenchDrainCalculator stones={stones} />
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Under every surface bed",
              text: "SABS 250 µm damp-proof membrane goes under the floor slab, laps taped — general-purpose black plastic isn't a DPM.",
              href: "/products/damp-proof-membrane-250-micron-3x30m",
              cta: "Shop DPM →",
            },
            {
              title: "Stormwater crossings",
              text: "Concrete pipes, portal culverts, manholes and channel drains — sized by the engineer, quoted with the precast maker.",
              href: "/products?category=precast-drainage",
              cta: "Shop precast →",
            },
            {
              title: "Delivered with the stone",
              text: "Pipes, precast and rolls come on the supplier's flatbed or crane truck; the bedding sand and drainage stone on our tippers. We confirm slots before dispatch.",
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
            <h2 className="font-display text-lg font-bold text-basalt">Draining the whole site?</h2>
            <p className="mt-1 font-body text-sm text-slate">See everything for the drainage stage — pipe, fittings, bedding, stone, fabric and the mini excavator — and save it to a project list.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop-by-stage" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
              Shop by build stage
            </Link>
            <Link href="/quote" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">
              Request a quote
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
