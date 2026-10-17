"use client";

import { createContext, useContext } from "react";
import type { LeadPhoto } from "@/lib/cms";

/**
 * Every product's lead photo by SKU, loaded once in the root layout
 * (getLeadPhotos) so any thumbnail on any page — recently viewed,
 * recommendations, search, cart, checkout — shows the product's real photo.
 */
const ProductPhotosContext = createContext<Record<string, LeadPhoto>>({});

export function ProductPhotosProvider({ photos, children }: { photos: Record<string, LeadPhoto>; children: React.ReactNode }) {
  return <ProductPhotosContext.Provider value={photos}>{children}</ProductPhotosContext.Provider>;
}

export function useProductPhoto(sku: string | undefined): LeadPhoto | undefined {
  const photos = useContext(ProductPhotosContext);
  return sku ? photos[sku] : undefined;
}

/** The first of these SKUs that has a photo — e.g. a category tile's cover. */
export function useFirstPhoto(skus: string[]): LeadPhoto | undefined {
  const photos = useContext(ProductPhotosContext);
  for (const sku of skus) if (photos[sku]) return photos[sku];
  return undefined;
}
