import type { Metadata } from "next";
import Link from "next/link";
import { getHireCoverage, provinceSlug } from "@/lib/hire-coverage";

export const metadata: Metadata = {
  title: "Plant Hire by Province",
  description: "Provinces where vetted plant-hire and site-services partners are active on Aggregated Aggregates.",
  alternates: { canonical: "/plant-hire/areas" },
};
export const revalidate = 300;

/** Lists only provinces with active partners (getHireCoverage). */
export default async function HireAreasPage() {
  const coverage = await getHireCoverage();
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/plant-hire" className="hover:text-seam-blue">Plant Hire</Link> / By province
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Plant hire by province</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-slate">
        Provinces where vetted partners are active on the platform today. We&apos;re adding partners across South Africa — if your province isn&apos;t listed,
        you can still send a request and we&apos;ll look for a partner near your site.
      </p>
      {coverage.length === 0 ? (
        <p className="mt-8 rounded-sm border border-basalt/10 bg-white p-6 font-body text-sm text-slate">
          Our partner network is being set up. <Link href="/plant-hire" className="font-semibold text-seam-blue hover:underline">Send a request</Link> and we&apos;ll
          quote you from a partner near your site.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coverage.map((c) => (
            <li key={c.province}>
              <Link href={`/plant-hire/areas/${provinceSlug(c.province)}`} className="block rounded-sm border border-basalt/10 bg-white p-5 hover:border-seam-blue">
                <h2 className="font-display text-lg font-semibold text-basalt">Plant hire in {c.province}</h2>
                <p className="mt-1 font-body text-sm text-slate">{c.skus.length} machine{c.skus.length === 1 ? "" : "s"} and services available</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
