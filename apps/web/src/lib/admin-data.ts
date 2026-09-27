import "server-only";
import { PRODUCTS, type Product } from "@/data/catalogue";
import { api } from "./api";
import type { SiteContent } from "./cms";

export type AdminProduct = Product & {
  isActive: boolean;
  description: string | null;
  featuredRank: number | null;
  images: { id: string; altText: string | null }[];
};

/** Live (uncached) merchandising state for the admin, including hidden products. */
export async function adminCatalogue(): Promise<AdminProduct[] | null> {
  const result = await api<{ sku: string; isActive: boolean; description: string | null; featuredRank: number | null; images: { id: string; altText: string | null }[] }[]>(
    "/merchandising/products",
  );
  if (!result.ok) return null;
  const bySku = new Map(result.data.map((o) => [o.sku, o]));
  return PRODUCTS.map((p) => {
    const o = bySku.get(p.sku);
    return { ...p, isActive: o?.isActive ?? true, description: o?.description ?? null, featuredRank: o?.featuredRank ?? null, images: o?.images ?? [] };
  });
}

export async function savedContent(): Promise<Partial<SiteContent> | null> {
  const result = await api<Partial<SiteContent>>("/content");
  return result.ok ? result.data : null;
}
