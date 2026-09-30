"use client";

import Link from "next/link";
import { useState } from "react";
import { pricePoints, type Product } from "@/data/catalogue";
import { MaterialSwatch } from "@/components/product/MaterialSwatch";
import { PendingPhotoTag } from "@/components/product/PendingPhotoTag";
import { formatZAR } from "@/lib/pricing";

type Mode = "bulk" | "bag";

/**
 * Listing card with the wireframe's bulk/bag toggle: switching shows the
 * bulk (ton / m³) or bagged price without leaving the grid.
 */
export function ProductCard({
  product,
  preferBag = false,
}: {
  product: Product & { images?: { src: string; alt: string; pending?: boolean }[] };
  preferBag?: boolean;
}) {
  const photo = product.images?.[0];
  const points = pricePoints(product);
  const bulk = points.filter((p) => p.unit !== "bag");
  const bag = points.filter((p) => p.unit === "bag");
  const modes: Mode[] = [...(bulk.length ? (["bulk"] as Mode[]) : []), ...(bag.length ? (["bag"] as Mode[]) : [])];
  const [mode, setMode] = useState<Mode>(preferBag && modes.includes("bag") ? "bag" : modes[0]);
  const shown = mode === "bulk" ? bulk : bag;
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
        {shown.map((point, index) => (
          <span key={point.unit} className={index === 0 ? "font-semibold" : "text-slate"}>
            {index > 0 && " • "}
            {formatZAR(point.price)} /{point.label}
          </span>
        ))}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2">
        {modes.length > 1 ? (
          <div className="flex overflow-hidden rounded-sm border border-basalt/15 font-mono text-[10px]" role="group" aria-label="Unit of sale">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`px-2 py-1 ${mode === m ? "bg-seam-blue text-limestone" : "bg-limestone text-slate"}`}
              >
                {m === "bulk" ? "Bulk" : "Bag"}
              </button>
            ))}
          </div>
        ) : (
          <span className="rounded-sm bg-limestone px-2 py-1 font-mono text-[10px] text-slate">
            {modes[0] === "bulk" ? "Bulk only" : "Bagged only"}
          </span>
        )}
        <Link
          href={`/quote?sku=${product.sku}&unit=${shown[0].unit}`}
          className="rounded-sm bg-seam-blue px-3 py-1.5 font-body text-xs font-semibold text-limestone hover:bg-basalt"
        >
          Add to Quote
        </Link>
      </div>
    </div>
  );
}
