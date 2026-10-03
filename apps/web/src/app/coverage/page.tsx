import type { Metadata } from "next";
import Link from "next/link";
import { CoverageExplorer } from "@/components/coverage/CoverageExplorer";
import { COVERAGE_TOWNS } from "@/data/coverage-towns";
import { DELIVERY_RULES } from "@/data/catalogue";
import { PROVINCES } from "@/lib/suppliers";

export const metadata: Metadata = {
  title: "Where We Deliver — Towns & Cities in All 9 Provinces",
  description: `Aggregates, sand and stone delivered across South Africa. Check your town: ${COVERAGE_TOWNS.length}+ towns and cities in all nine provinces, from Johannesburg and Durban to Upington and Musina.`,
  alternates: { canonical: "/coverage" },
};

/** "Do you deliver to my town?" — answered with a search, a map and a list by province. */
export default function CoveragePage({ searchParams }: { searchParams: { province?: string } }) {
  const initialProvince = PROVINCES.find((p) => p === searchParams.province);
  const metros = COVERAGE_TOWNS.filter((t) => t.tier === "metro").length;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Where We Deliver
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Do we deliver to your town? Almost certainly.</h1>
      <p className="mt-3 max-w-3xl font-body text-sm text-slate">
        We deliver aggregates, sand, stone and cement across all nine provinces, from the approved partner supplier nearest your site. Search for your town or
        suburb, or open your province below.
      </p>
      <dl className="mt-6 grid max-w-2xl grid-cols-3 gap-3">
        {[
          ["9", "provinces"],
          [String(COVERAGE_TOWNS.length), "towns & cities listed"],
          [String(metros), "metros"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-sm border border-basalt/10 bg-white p-3">
            <dt className="font-mono text-[10px] uppercase text-slate">{label}</dt>
            <dd className="font-display text-2xl font-bold text-basalt">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-8">
        <CoverageExplorer
          towns={COVERAGE_TOWNS}
          provinces={[...PROVINCES]}
          initialProvince={initialProvince}
          bands={DELIVERY_RULES.bands.map((b) => ({ minKm: b.minKm, maxKm: b.maxKm, label: b.label }))}
          quoteOverKm={DELIVERY_RULES.quoteOverKm}
        />
      </div>
      <p className="mt-10 max-w-3xl font-body text-xs text-slate">
        Towns are listed for each province by economic activity, population and building demand. Not on the list? We very likely still deliver — request a quote
        and we&apos;ll confirm. Delivery charges depend on the distance from the nearest partner supplier; see{" "}
        <Link href="/delivery-areas" className="text-seam-blue hover:underline">Delivery areas & charges</Link>. Town locations: GeoNames (CC BY 4.0).
      </p>
    </div>
  );
}
