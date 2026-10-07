import Link from "next/link";
import { MaterialSwatch } from "@/components/product/MaterialSwatch";
import { PendingPhotoTag } from "@/components/product/PendingPhotoTag";
import type { PackagedProduct, TierPrices } from "@/data/packaged";
import type { ReadyMixProduct } from "@/data/ready-mix";
import { formatZAR } from "@/lib/pricing";

/** Listing card for packaged goods (CAT-10/11) and ready-mix (CAT-12): a real price only where it is benchmarked. */
export function PackagedProductCard({ product }: { product: (PackagedProduct | ReadyMixProduct) & { images?: { src: string; alt: string; pending?: boolean }[] } }) {
  const units: { unit: string; label: string; prices: TierPrices | null }[] = product.units;
  const headline = units.find((u) => u.prices !== null);
  const photo = product.images?.[0];
  const href = `/products/${product.slug}`;
  return (
    <div className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-4 transition hover:border-seam-blue hover:shadow-sm">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block">
        {photo?.pending && <PendingPhotoTag />}
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- served and cached by our own image route
          <img src={photo.src} alt={photo.alt} loading="lazy" className="h-28 w-full rounded-sm object-cover" />
        ) : (
          <MaterialSwatch sku={product.sku} categorySlug={product.categorySlug} />
        )}
      </Link>
      <Link href={href} className="mt-3 font-body text-sm font-semibold text-basalt hover:text-seam-blue">
        {product.name}
      </Link>
      <p className="font-mono text-[10px] text-slate">
        {product.sku}
        {product.gradingStandard && ` · ${product.gradingStandard}`}
      </p>
      <p className="mt-2 flex-1 font-body text-sm text-basalt">
        {headline?.prices ? (
          <span className="font-semibold">
            {formatZAR(headline.prices.RETAIL)} /{headline.label}
          </span>
        ) : (
          <span className="text-slate">Price on request</span>
        )}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="rounded-sm bg-limestone px-2 py-1 font-mono text-[10px] text-slate">
          {product.kind === "ready-mix" ? `Min. ${product.minimumLoadM3}m³ load` : units.map((u) => u.label).join(" · ")}
        </span>
        <Link
          href={`/quote?sku=${product.sku}&unit=${(headline ?? units[0]).unit}`}
          className="shrink-0 rounded-sm bg-seam-blue px-3 py-1.5 font-body text-xs font-semibold text-limestone hover:bg-basalt"
        >
          {headline ? "Add to Quote" : "Request Quote"}
        </Link>
      </div>
    </div>
  );
}
