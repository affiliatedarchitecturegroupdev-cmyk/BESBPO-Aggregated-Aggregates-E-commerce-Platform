import Link from "next/link";
import { CompareToggle } from "@/components/product/CompareToggle";
import { ProductThumb } from "@/components/product/ProductThumb";
import { QuickAdd } from "@/components/product/QuickAdd";
import { CardStars } from "@/components/reviews/CardStars";
import type { IndexedProduct } from "@/lib/product-index";
import { formatZAR } from "@/lib/pricing";

/** Products bought in minimum loads or per job, which go through their own page rather than a one-tap add. */
const NO_QUICK_ADD = new Set(["ready-mix-concrete"]);

/**
 * The product listing's card (ROADMAP 3.3): photo or swatch, a clear Buy online or Quote badge, the "from" price
 * where there is one, quick add-to-cart and compare.
 */
export function ListingCard({ product }: { product: IndexedProduct }) {
  const href = `/products/${product.slug}`;
  const online = product.fromPrice !== null;
  return (
    <div className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-4 transition hover:border-seam-blue hover:shadow-sm">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block">
        <ProductThumb sku={product.sku} categorySlug={product.categorySlug} name={product.name} />
        <span
          className={`absolute left-2 top-2 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${
            online ? "bg-seam-blue text-limestone" : "bg-limestone text-basalt ring-1 ring-basalt/20"
          }`}
        >
          {online ? "Buy online" : "Quote"}
        </span>
      </Link>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-slate">{product.categoryName}</p>
      <Link href={href} className="mt-0.5 font-body text-sm font-semibold text-basalt hover:text-seam-blue">
        {product.name}
      </Link>
      {(product.brand || product.standard) && <p className="font-mono text-[10px] text-slate">{[product.brand, product.standard].filter(Boolean).join(" · ")}</p>}
      <CardStars sku={product.sku} />
      <p className="mt-2 flex-1 font-body text-sm text-basalt">
        {online ? (
          <>
            <span className="text-xs text-slate">From </span>
            <span className="font-semibold">{formatZAR(product.fromPrice!)}</span>
            <span className="text-xs text-slate"> / {product.fromUnit}</span>
          </>
        ) : (
          <span className="text-xs text-slate">Price on request — we confirm a supplier price on a quote</span>
        )}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {online && product.fromUnitCode && !NO_QUICK_ADD.has(product.categorySlug) ? (
          <QuickAdd sku={product.sku} unit={product.fromUnitCode} unitLabel={product.fromUnit ?? "unit"} />
        ) : (
          <Link href={href} className="rounded-sm border border-basalt/20 px-3 py-1.5 font-body text-xs font-semibold text-basalt hover:border-seam-blue">
            {online ? "Choose quantity" : "Request a quote"}
          </Link>
        )}
        <CompareToggle sku={product.sku} />
      </div>
    </div>
  );
}
