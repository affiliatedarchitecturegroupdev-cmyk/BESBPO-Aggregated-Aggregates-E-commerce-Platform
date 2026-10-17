import type { Metadata } from "next";
import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { DEPARTMENTS, SERVICE_LINKS } from "@/data/departments";
import { getHiddenSkus } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { PRODUCT_INDEX } from "@/lib/product-index";

export const metadata: Metadata = {
  title: "All Departments",
  description:
    "Every department in one place: aggregates and sand, cement and concrete, steel, bricks and blocks, paving, drainage, roofing, timber, doors and windows, fencing, water and plumbing, ceilings, tools and PPE, and waterproofing and paint — plus plant hire, services and design.",
  alternates: { canonical: "/departments" },
};

const CATEGORY = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** The full range, department by department, with every category, its product count and lowest online price. */
export default async function DepartmentsPage() {
  const hidden = new Set(await getHiddenSkus());
  const products = PRODUCT_INDEX.filter((p) => !hidden.has(p.sku));
  const pricedTotal = products.filter((p) => p.fromPrice !== null).length;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / All departments
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">All departments</h1>
      <p className="mt-2 max-w-3xl font-body text-sm text-slate">
        {products.length} products across {DEPARTMENTS.length} departments — {pricedTotal} priced to{" "}
        <Link href="/buy-online" className="text-seam-blue hover:underline">buy online now</Link>, the rest quoted by the partner supplier nearest your site.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {DEPARTMENTS.map((d) => {
          const inDept = products.filter((p) => p.departmentSlug === d.slug);
          return (
            <section key={d.slug} id={d.slug} className="rounded-sm border border-basalt/10 bg-white p-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-bold text-basalt">
                  <Link href={d.href} className="hover:text-seam-blue">{d.name}</Link>
                </h2>
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-slate">{inDept.length} products</span>
              </div>
              <p className="mt-1 font-body text-sm text-slate">{d.blurb}</p>
              <ul className="mt-4 divide-y divide-basalt/5">
                {d.categorySlugs.map((slug) => {
                  const category = CATEGORY.get(slug);
                  if (!category) return null;
                  const items = inDept.filter((p) => p.categorySlug === slug);
                  const priced = items.filter((p) => p.fromPrice !== null);
                  const from = priced.length > 0 ? Math.min(...priced.map((p) => p.fromPrice!)) : null;
                  return (
                    <li key={slug} className="flex items-baseline justify-between gap-3 py-2">
                      <Link href={`/products?category=${slug}`} className="font-body text-sm text-basalt hover:text-seam-blue">
                        {category.name}
                      </Link>
                      <span className="shrink-0 font-mono text-[11px] text-slate">
                        {items.length}
                        {from !== null ? ` · from ${formatZAR(from)}` : " · on quote"}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <Link href={d.href} className="mt-3 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">
                Shop {d.name} →
              </Link>
            </section>
          );
        })}
      </div>
      <section className="mt-10 rounded-sm border border-basalt/10 bg-limestone p-5">
        <h2 className="font-display text-lg font-bold text-basalt">Plant hire, services &amp; design</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[{ href: "/aa-60-120", label: "AA 60/120 Express" }, ...SERVICE_LINKS, { href: "/equipment-hire", label: "Equipment Hire" }, { href: "/estimator", label: "Project Estimator" }, { href: "/calculators", label: "Calculators" }].map((l) => (
            <Link key={l.href} href={l.href} className="rounded-sm border border-basalt/15 bg-white px-3 py-1.5 font-body text-sm text-basalt hover:border-seam-blue hover:text-seam-blue">
              {l.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
