import Link from "next/link";
import { INDUSTRIES } from "@/data/industries";

// The 6 approved B2B target sectors — supersedes the earlier generic
// "Shop by Application" concept with named industries a B2B buyer
// recognizes. Links through to category-filtered product listings.
export function IndustriesWeServe() {
  return (
    <section className="border-t border-basalt/10 bg-white px-4 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-seam-blue">Who We Supply</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-basalt">Industries We Serve</h2>
          </div>
          <Link href="/industries-we-serve" className="hidden font-body text-sm font-semibold text-seam-blue hover:underline md:block">
            See all →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {INDUSTRIES.map((industry) => (
            <Link
              key={industry.slug}
              href={`/products?industry=${industry.slug}`}
              className="rounded-sm border border-basalt/10 p-5 transition-colors hover:border-seam-blue"
            >
              <h3 className="font-display text-base font-semibold text-basalt">{industry.name}</h3>
              <p className="mt-2 font-body text-sm text-slate">{industry.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
