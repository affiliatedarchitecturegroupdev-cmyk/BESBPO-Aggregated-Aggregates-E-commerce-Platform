import type { Metadata } from "next";
import Link from "next/link";
import { PackagedProductCard } from "@/components/product/PackagedProductCard";
import { RoofCalculator } from "@/components/product/RoofCalculator";
import { CATEGORIES } from "@/data/categories";
import { MASONRY_CATEGORY_CODES, MASONRY_PRODUCTS, ROOF_TILE_CATEGORIES } from "@/data/masonry";
import { CUT_TO_LENGTH, ROOFING_CATEGORY_CODES, ROOFING_PRODUCTS, TIMBER_SECTIONS } from "@/data/roofing";
import { getMasonryCatalogue, getRoofingCatalogue } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Roofing — Roof Timber, IBR & Corrugated Sheeting, Concrete Roof Tiles, Flashings, Insulation & Gutters",
  description:
    "SA pine roof and structural timber (S5/S7, H2/H3) from 38 × 38 to 50 × 228 mm, IBR, corrugated and concealed-fix roof sheets from 0.30 to 0.80 mm in standard lengths or cut to length from 1 to 14 m, concrete roof tiles, ridge and flashings, roofing screws, ceiling insulation, underlay and PVC gutters — with a roof calculator.",
  alternates: { canonical: "/roofing" },
};

const LINE = [
  ...CATEGORIES.filter((c) => c.catalogueGroup === "roofing").map((c) => ({ ...c, code: ROOFING_CATEGORY_CODES[c.slug], count: ROOFING_PRODUCTS.filter((p) => p.categorySlug === c.slug).length })),
  ...CATEGORIES.filter((c) => ROOF_TILE_CATEGORIES.includes(c.slug)).map((c) => ({ ...c, code: MASONRY_CATEGORY_CODES[c.slug], count: MASONRY_PRODUCTS.filter((p) => p.categorySlug === c.slug).length })),
];

/** What each section is used for — the owner's sizing list (ROOFING_CATALOGUE.md). */
const SECTION_USES: Record<string, string> = {
  "38 × 38 mm": "Brandering, battens and light framing",
  "38 × 76 mm": "Purlins, wall studs and roof trusses",
  "38 × 114 mm": "Rafters, floor joists and kappa beams",
  "38 × 152 mm": "Structural roof beams and rafters",
  "38 × 228 mm": "Heavy structural roof beams",
  "50 × 76 mm": "Heavy purlins and structural supports",
  "50 × 114 mm": "Heavy-duty structural and industrial timber",
  "50 × 152 mm": "Heavy-duty structural and industrial timber",
  "50 × 228 mm": "Heavy-duty structural and industrial timber",
};
const TIMBER_COLUMNS = [
  { grade: "S5", treatment: "H2" },
  { grade: "S5", treatment: "H3" },
  { grade: "S7", treatment: "H2" },
  { grade: "S7", treatment: "H3" },
] as const;

/**
 * Landing page for the roofing line, CAT-26..28, concrete roof tiles, CAT-29, and roof & structural timber with its
 * connectors, CAT-30/31 (ROOFING_CATALOGUE.md); prices only where benchmarked, everything else on request.
 */
export default async function RoofingPage() {
  const [roofing, masonry] = await Promise.all([getRoofingCatalogue(), getMasonryCatalogue()]);
  const tilesVisible = masonry.filter((p) => ROOF_TILE_CATEGORIES.includes(p.categorySlug));
  const live = [...roofing, ...tilesVisible].filter((p) => p.units.some((u) => u.prices !== null));
  const sheets = roofing
    .filter((p) => p.roofProfile !== null && p.coverWidthMm !== null)
    .map((p) => ({ sku: p.sku, name: p.name, profile: p.roofProfile!, coverWidthMm: p.coverWidthMm!, ratePerMetre: p.listPricePerMetre }));
  const timberLink = (section: string, grade: string, treatment: string, finish: string) =>
    roofing.find((p) => p.section === section && p.timberGrade === grade && p.timberTreatment === treatment && p.timberFinish === finish);
  const tiles = tilesVisible.filter((p) => p.unitsPerM2 !== null).map((p) => ({ sku: p.sku, name: p.name, unitsPerM2: p.unitsPerM2! }));

  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / Roofing
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Timber · sheeting · tiles · flashings · insulation · gutters</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">Close the building in</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            SA pine roof and structural timber in S5 or S7, H2 or H3, from 38 × 38 mm brandering to 50 × 228 mm beams. IBR, corrugated and
            concealed-fix sheets from 0.30 to 0.80 mm — galvanised, Zincalume® or colour-coated — in stock lengths or cut to any length
            from {CUT_TO_LENGTH.min_m} to {CUT_TO_LENGTH.max_m} m, or concrete roof tiles. Then the ridge, flashings, fixings, insulation and gutters to finish
            the job, delivered by flatbed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/products?category=roof-sheeting" className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone">
              Shop roof sheeting
            </Link>
            <a href="#roof-timber" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Roof timber
            </a>
            <a href="#roof-calculator" className="rounded-sm border border-limestone/30 px-5 py-2.5 font-body text-sm font-semibold hover:border-ochre-gold">
              Size a roof
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="font-display text-2xl font-bold text-basalt">Shop the line</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LINE.map((c) => (
            <Link key={c.slug} href={`/products?category=${c.slug}`} className="rounded-sm border border-basalt/10 bg-white p-5 transition-colors hover:border-seam-blue">
              <p className="font-mono text-[10px] text-slate">{c.code}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-basalt">{c.name}</h3>
              <p className="mt-1 font-body text-sm text-slate">{c.description}</p>
              <p className="mt-3 font-mono text-[11px] text-seam-blue">{c.count} products →</p>
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
            <h2 className="font-display text-xl font-bold text-basalt">Choosing a sheet</h2>
            <table className="mt-3 w-full rounded-sm border border-basalt/10 bg-white text-left font-body text-sm">
              <tbody className="divide-y divide-basalt/10">
                {[
                  ["Profile", "IBR (686 mm cover) for most roofs and cladding; corrugated (762 mm) for the traditional look; concealed-fix for low pitches without exposed screws."],
                  ["Thickness", "0.30 mm for sheds and outbuildings; 0.40–0.47 mm for houses; 0.50–0.80 mm for wider purlin spacings, industrial roofs and long spans."],
                  ["Coating", "Galvanised Z100–Z275 (the higher the Z, the more zinc); Zincalume® AZ150 lasts longer; colour-coated adds a factory paint finish."],
                  ["Length", `Stock lengths of 3.0, 3.6, 4.2, 4.8, 6.0 and 6.6 m; or cut to length from ${CUT_TO_LENGTH.min_m} to ${CUT_TO_LENGTH.max_m} m so each sheet runs eaves to ridge with no end laps.`],
                  ["Coast & industry", "Within a few kilometres of the sea or heavy industry, use Z275, Zincalume® or colour-coated sheet and Class 4 or stainless fixings."],
                ].map(([k, v]) => (
                  <tr key={k}>
                    <th className="w-32 px-4 py-2.5 align-top font-semibold text-basalt">{k}</th>
                    <td className="px-4 py-2.5 text-slate">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 font-body text-xs text-slate">
              The minimum pitch, purlin spacing and fixing pattern for each profile and gauge come from the maker&apos;s tables; the truss design and your
              drawings govern. New houses also need ceiling insulation to SANS 10400-XA.
            </p>
          </div>
          <div id="roof-calculator" className="min-w-0 scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-basalt">Work out what you need</h2>
            <p className="mt-2 font-body text-sm text-slate">Plan size and pitch to sheets or tiles, ridge, underlay, insulation, gutters and downpipes.</p>
            <div className="mt-3">
              <RoofCalculator sheets={sheets} tiles={tiles} />
            </div>
          </div>
        </section>

        <section id="roof-timber" className="mt-14 scroll-mt-24">
          <h2 className="font-display text-2xl font-bold text-basalt">Roof &amp; structural timber</h2>
          <p className="mt-2 max-w-3xl font-body text-sm text-slate">
            SA pine in every section below, in 3.0, 3.6, 4.2, 4.8, 6.0 and 6.6 m lengths. Pick the section, then the grade and treatment — each is sized
            (planed to size) or rough-sawn. Timber is priced with the supplier on your quote, with the grade and treatment confirmed.
          </p>
          <div className="mt-5 grid gap-8 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <div className="overflow-x-auto rounded-sm border border-basalt/10 bg-white">
                <table className="w-full min-w-[34rem] text-left font-body text-sm">
                  <thead className="bg-basalt/5 font-mono text-[10px] uppercase tracking-widest text-slate">
                    <tr>
                      <th className="px-3 py-2">Section</th>
                      {TIMBER_COLUMNS.map((c) => (
                        <th key={`${c.grade}${c.treatment}`} className="px-2 py-2 text-center">
                          {c.grade} {c.treatment}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-basalt/10">
                    {TIMBER_SECTIONS.map((section) => (
                      <tr key={section}>
                        <th className="px-3 py-2 align-top font-normal">
                          <span className="font-semibold text-basalt">{section}</span>
                          <span className="block text-xs text-slate">{SECTION_USES[section]}</span>
                        </th>
                        {TIMBER_COLUMNS.map((c) => {
                          const sized = timberLink(section, c.grade, c.treatment, "Sized");
                          const rough = timberLink(section, c.grade, c.treatment, "Rough-sawn");
                          return (
                            <td key={`${c.grade}${c.treatment}`} className="px-2 py-2 text-center align-top text-xs">
                              {sized && (
                                <Link href={`/products/${sized.slug}`} className="block text-seam-blue hover:underline">
                                  Sized
                                </Link>
                              )}
                              {rough && (
                                <Link href={`/products/${rough.slug}`} className="block text-seam-blue hover:underline">
                                  Rough
                                </Link>
                              )}
                              {!sized && !rough && <span className="text-slate">—</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="min-w-0 lg:col-span-2">
              <table className="w-full rounded-sm border border-basalt/10 bg-white text-left font-body text-sm">
                <tbody className="divide-y divide-basalt/10">
                  {[
                    ["H2", "Insect and borer protection for timber kept dry under the roof — trusses, rafters, purlins, ceiling battens. Never where it will get wet. The budget choice."],
                    ["H3", "For timber above ground that gets wet: exposed eaves and overhangs, fencing rails, balustrades, cladding, decks, carports and pergolas, and coastal or damp sites."],
                    ["S5", "The standard stress grade for house roofs (SANS 1783) — what most truss designs call for."],
                    ["S7", "Stronger and stiffer, for longer spans and heavier loads — only where the truss design or engineer specifies it. Graded to order."],
                    ["Profile", "Sized timber is planed to a uniform size so members line up; rough-sawn is straight off the saw for hidden or clad framing."],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <th className="w-20 px-4 py-2.5 align-top font-semibold text-basalt">{k}</th>
                      <td className="px-4 py-2.5 text-slate">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 font-body text-xs text-slate">
                Sizes, spans and the grade come from your truss design, the SANS 10400-L span tables or your engineer. Seal every cut end of treated timber,
                use galvanised fixings, and tie the roof down to the walls.
              </p>
              <Link href="/products?category=timber-connectors" className="mt-3 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">
                Hangers, clips, hoop iron and fixings →
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Cut to length",
              text: `Long sheets cut to each slope from ${CUT_TO_LENGTH.min_m} to ${CUT_TO_LENGTH.max_m} m — no end laps to leak. Send the cutting list from any sheet's page and the merchant confirms lengths, lead time and price.`,
              href: "/products?category=roof-sheeting",
              cta: "Choose a sheet →",
            },
            {
              title: "Concrete roof tiles",
              text: "Double Roman and flat-profile tiles with matching ridge tiles and under-tile membrane — about 10 tiles to the square metre.",
              href: "/products?category=concrete-roof-tiles",
              cta: "Shop roof tiles →",
            },
            {
              title: "The structure underneath",
              text: "Roof timber from the range above, or steel purlins (lipped channel) and angles from the steel line. Prefabricated trusses are designed and made for each roof, so they're quoted with the plans.",
              href: "/reinforcing-steel",
              cta: "Shop structural steel →",
            },
          ].map((b) => (
            <div key={b.title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-basalt">{b.title}</h3>
              <p className="mt-2 font-body text-sm text-slate">{b.text}</p>
              <Link href={b.href} className="mt-3 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">
                {b.cta}
              </Link>
            </div>
          ))}
        </section>

        <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-display text-lg font-bold text-basalt">Roofing the whole house?</h2>
            <p className="mt-1 font-body text-sm text-slate">See everything for the roofing stage and save it to a project list, or send the plans for one quote.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/shop-by-stage?stage=ROOFING" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
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
