import "server-only";
import { PRODUCTS } from "@/data/catalogue";
import { PACKAGED_PRODUCTS } from "@/data/packaged";
import { formatZAR, UNIT_LABELS } from "@/lib/pricing";
import { api } from "./api";
import type { SiteContent } from "./cms";

/** Every product staff merchandise — the 48 aggregates and the packaged goods — with a one-line price summary. */
export type AdminProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  gradingStandard: string | null;
  priceSummary: string;
  packaged: boolean;
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
  const overlay = (sku: string) => {
    const o = bySku.get(sku);
    return { isActive: o?.isActive ?? true, description: o?.description ?? null, featuredRank: o?.featuredRank ?? null, images: o?.images ?? [] };
  };
  return [
    ...PRODUCTS.map((p) => ({
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      categorySlug: p.categorySlug,
      gradingStandard: p.gradingStandard,
      priceSummary: p.units.map((u) => `${formatZAR(p.prices.RETAIL[u] ?? 0)}/${UNIT_LABELS[u]}`).join(" · "),
      packaged: false,
      ...overlay(p.sku),
    })),
    ...PACKAGED_PRODUCTS.map((p) => ({
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      categorySlug: p.categorySlug,
      gradingStandard: p.gradingStandard,
      priceSummary: p.units.map((u) => (u.prices ? `${formatZAR(u.prices.RETAIL)}/${u.label}` : `${u.label}: on request`)).join(" · "),
      packaged: true,
      ...overlay(p.sku),
    })),
  ];
}

export async function savedContent(): Promise<Partial<SiteContent> | null> {
  const result = await api<Partial<SiteContent>>("/content");
  return result.ok ? result.data : null;
}
