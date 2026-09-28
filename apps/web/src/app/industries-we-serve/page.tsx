import Link from "next/link";
import { INDUSTRIES } from "@/data/industries";
import { CATEGORIES } from "@/data/categories";

export const metadata = {
  title: "Industries We Serve",
  description: "Ready-mix and precast, asphalt and roadworks, earthworks, mining, municipal water infrastructure, and agriculture and landscaping.",
  alternates: { canonical: "/industries-we-serve" },
};

/**
 * The six approved B2B target sectors, each linking to its relevant
 * categories. The homepage's Industries We Serve section links here.
 */
export default function IndustriesWeServePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Industries We Serve
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Industries We Serve</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-slate">
        Aggregated Aggregates supplies six core B2B sectors across the construction and infrastructure value chain —
        from ready-mix batching plants to municipal water infrastructure contractors.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {INDUSTRIES.map((industry) => (
          <div key={industry.slug} className="rounded-sm border border-basalt/10 bg-white p-6">
            <h2 className="font-display text-lg font-bold text-basalt">{industry.name}</h2>
            <p className="mt-2 font-body text-sm text-slate">{industry.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {industry.relevantCategorySlugs.map((slug) => {
                const category = CATEGORIES.find((c) => c.slug === slug);
                return category ? (
                  <Link key={slug} href={`/products?category=${slug}`} className="rounded-sm bg-limestone px-2 py-1 font-mono text-[10px] text-slate hover:text-seam-blue">
                    {category.name}
                  </Link>
                ) : null;
              })}
            </div>
            <Link
              href={`/products?industry=${industry.slug}`}
              className="mt-4 inline-block font-body text-sm font-semibold text-seam-blue hover:underline"
            >
              Shop for {industry.name} →
            </Link>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-6 text-center">
        <p className="font-body text-sm text-basalt">
          Not seeing your sector listed? We onboard new Trade and Volume/Civil Bulk accounts across the full
          construction materials value chain.
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-block rounded-sm bg-seam-blue px-5 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt"
        >
          Talk to Sales
        </Link>
      </div>
    </div>
  );
}
