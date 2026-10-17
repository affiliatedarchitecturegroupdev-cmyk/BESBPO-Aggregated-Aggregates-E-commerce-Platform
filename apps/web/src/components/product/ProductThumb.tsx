"use client";

import { MaterialSwatch } from "@/components/product/MaterialSwatch";
import { useProductPhoto } from "@/components/product/ProductPhotos";

/**
 * A product's picture at any size: its lead photo where one is cleared,
 * otherwise the material swatch. Use this for every product thumbnail so a
 * photo, once added, shows everywhere the product does.
 */
export function ProductThumb({
  sku,
  categorySlug,
  name,
  className,
  grains,
}: {
  sku: string;
  categorySlug: string;
  /** Alt text when the photo has none. */
  name?: string;
  className?: string;
  grains?: number;
}) {
  const photo = useProductPhoto(sku);
  if (!photo) return <MaterialSwatch sku={sku} categorySlug={categorySlug} className={className} grains={grains} />;
  // eslint-disable-next-line @next/next/no-img-element -- served by our own licence-gated route
  return <img src={photo.src} alt={photo.alt || name || ""} loading="lazy" decoding="async" className={`bg-limestone object-cover ${className ?? "h-28 w-full rounded-sm"}`} />;
}
