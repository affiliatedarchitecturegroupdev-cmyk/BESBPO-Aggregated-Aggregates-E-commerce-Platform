import Link from "next/link";
import { DEPARTMENTS } from "@/data/departments";
import { formatZAR } from "@/lib/pricing";
import { PRODUCT_INDEX } from "@/lib/product-index";

/**
 * Shop by department: the whole range on one screen — each department with
 * its product count, how many can be bought online now and the lowest
 * online price.
 */
export function DepartmentTiles() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-2xl font-bold text-basalt">Shop by department</h2>
        <Link href="/departments" className="shrink-0 font-body text-sm text-seam-blue hover:underline">
          All departments →
        </Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {DEPARTMENTS.map((d) => {
          const products = PRODUCT_INDEX.filter((p) => p.departmentSlug === d.slug);
          const priced = products.filter((p) => p.fromPrice !== null);
          const from = priced.length > 0 ? Math.min(...priced.map((p) => p.fromPrice!)) : null;
          return (
            <Link key={d.slug} href={d.href} className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-4 transition hover:border-seam-blue hover:shadow-sm">
              <span className="font-body text-sm font-semibold text-basalt group-hover:text-seam-blue">{d.name}</span>
              <span className="mt-1 line-clamp-2 font-body text-xs text-slate">{d.blurb}</span>
              <span className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-wide text-seam-blue">
                {products.length} products{priced.length > 0 ? ` · ${priced.length} buy online` : ""}
                {from !== null ? ` · from ${formatZAR(from)}` : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
