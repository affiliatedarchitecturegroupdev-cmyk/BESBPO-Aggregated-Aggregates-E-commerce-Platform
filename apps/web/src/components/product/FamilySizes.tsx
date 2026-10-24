import Link from "next/link";
import { familyOfSku } from "@/lib/product-index";
import { formatZAR } from "@/lib/pricing";

/**
 * On a product page: every other size of the same product, all visible at once (no dropdown to discover), with
 * the current size marked and each size's price or "quote" (docs/product-families.md). Nothing when the product
 * isn't part of a family.
 */
export function FamilySizes({ sku, hiddenSkus = [] }: { sku: string; hiddenSkus?: string[] }) {
  const family = familyOfSku(sku, new Set(hiddenSkus));
  if (!family || family.members.length < 2) return null;
  return (
    <section id="sizes" className="mt-8 scroll-mt-28 rounded-sm border border-basalt/10 bg-white p-5">
      <h2 className="font-display text-lg font-bold text-basalt">
        {family.title}: all {family.members.length} sizes
      </h2>
      <p className="mt-1 font-body text-xs text-slate">Tap a size to see its price, stock unit and details. Need a size that isn&apos;t listed? Ask on a quote — we source it.</p>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {family.members.map((m) => {
          const current = m.sku === sku;
          return (
            <li key={m.sku}>
              <Link
                href={`/products/${m.slug}`}
                aria-current={current ? "page" : undefined}
                className={`flex h-full flex-col rounded-sm border px-3 py-2 font-body text-sm ${current ? "border-seam-blue bg-seam-blue/5 font-semibold text-seam-blue" : "border-basalt/15 text-basalt hover:border-seam-blue"}`}
              >
                <span>{m.variant}</span>
                <span className="mt-0.5 text-[11px] font-normal text-slate">{current ? "This size" : m.fromPrice !== null ? `${formatZAR(m.fromPrice)} / ${m.fromUnit}` : "Quote"}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
