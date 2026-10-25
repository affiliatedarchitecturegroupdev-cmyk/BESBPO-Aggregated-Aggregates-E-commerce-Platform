import type { Metadata } from "next";
import Link from "next/link";
import { ProductThumb } from "@/components/product/ProductThumb";
import { DEPARTMENTS } from "@/data/departments";
import { getAddedProducts, getHiddenSkus, getLivePrices } from "@/lib/cms";
import { formatZAR } from "@/lib/pricing";
import { liveProductIndex } from "@/lib/product-index";
import { getVatRegistered } from "@/lib/tax";

export const metadata: Metadata = {
  title: "Buy Online — Priced Products",
  description: "Every product with a confirmed online price, ready to add to your cart: aggregates, cement, steel, bricks, paving, drainage, roofing, timber and building supplies.",
  alternates: { canonical: "/buy-online" },
};

/**
 * Everything that can go straight into the cart: products with a confirmed
 * online price (PRICING_POLICY.md — at least two SA retailers' regular
 * prices, or the pricing workbook). Everything else is quoted.
 */
export default async function BuyOnlinePage() {
  const [hiddenSkus, vatRegistered, live, added] = await Promise.all([getHiddenSkus(), getVatRegistered(), getLivePrices(), getAddedProducts()]);
  const hidden = new Set(hiddenSkus);
  const priced = liveProductIndex(live, added).filter((p) => p.fromPrice !== null && !hidden.has(p.sku));
  const departments = DEPARTMENTS.map((d) => ({ d, items: priced.filter((p) => p.departmentSlug === d.slug).sort((a, b) => a.name.localeCompare(b.name)) })).filter((x) => x.items.length > 0);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Buy online
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Buy online now</h1>
      <p className="mt-2 max-w-3xl font-body text-sm text-slate">
        {priced.length} products with a confirmed online price — open one, choose the quantity and add it to your cart. Delivery is worked out in the cart from
        the partner supplier nearest your site. Anything not listed here is quoted:{" "}
        <Link href="/quote" className="text-seam-blue hover:underline">request a quote</Link>.
      </p>
      <nav aria-label="Departments on this page" className="mt-6 flex flex-wrap gap-2">
        {departments.map(({ d, items }) => (
          <a key={d.slug} href={`#${d.slug}`} className="rounded-full border border-seam-blue/40 bg-seam-blue/5 px-3 py-1 font-mono text-xs text-seam-blue hover:bg-seam-blue hover:text-limestone">
            {d.shortName} · {items.length}
          </a>
        ))}
      </nav>
      {departments.map(({ d, items }) => (
        <section key={d.slug} id={d.slug} className="mt-10 scroll-mt-40">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-basalt">{d.name}</h2>
            <Link href={d.href} className="shrink-0 font-body text-sm text-seam-blue hover:underline">All {d.shortName.toLowerCase()} →</Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <li key={p.sku}>
                <Link href={`/products/${p.slug}`} className="flex h-full overflow-hidden rounded-sm border border-basalt/10 bg-white hover:border-seam-blue">
                  <ProductThumb sku={p.sku} categorySlug={p.categorySlug} name={p.name} className="w-20 shrink-0 rounded-none" grains={24} />
                  <span className="flex min-w-0 flex-1 flex-col px-4 py-3">
                    <span className="font-body text-sm font-semibold text-basalt">{p.name}</span>
                    <span className="mt-0.5 font-body text-xs text-slate">{p.categoryName}</span>
                    <span className="mt-auto pt-2 font-mono text-xs text-seam-blue">
                      from {formatZAR(p.fromPrice!)} / {p.fromUnit}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="mt-10 font-body text-xs text-slate">{vatRegistered ? "Retail prices, including VAT." : "Retail prices, before delivery and any trade discount."}</p>
    </div>
  );
}
