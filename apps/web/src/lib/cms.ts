import "server-only";
import { cache } from "react";
import { PRODUCTS, type Product } from "@/data/catalogue";
import { DEFAULT_SLIDES, MEDIA_BY_ID } from "@/data/media";
import { PACKAGED_PRODUCTS, type PackagedProduct } from "@/data/packaged";
import { apiCached } from "./api";

/**
 * Staff-editable storefront content (CMS) layered over the built-in copy and
 * the workbook catalogue. Everything here degrades to the built-in defaults
 * when the API is unavailable, so the storefront never breaks on the CMS.
 */

export type Link = { label: string; href: string };
export type AnnouncementContent = { enabled: boolean; message: string; link?: Link };
export type HeroContent = { eyebrow: string; headline: string; body: string; primaryCta: Link; secondaryCta: Link };
export type PromoContent = { title: string; body: string; cta: Link };
export type Slide = { imageId: string; caption: string; href?: string; enabled: boolean };
export type SlideshowContent = { enabled: boolean; intervalSeconds: number; slides: Slide[] };
export type SiteContent = { announcement: AnnouncementContent; hero: HeroContent; promo: PromoContent; slideshow: SlideshowContent };

export const DEFAULT_CONTENT: SiteContent = {
  announcement: { enabled: false, message: "" },
  hero: {
    eyebrow: "SANS / COLTO Graded",
    headline: "Every Layer Starts Here.",
    body: `Sub-base, crushed stone, sand and decorative aggregate — ${PRODUCTS.length} graded materials priced by ton, m³ or bag, delivered by tipper across KZN and Gauteng from our approved partner-supplier network.`,
    primaryCta: { label: "Shop Products", href: "/products" },
    secondaryCta: { label: "Request a Bulk Quote", href: "/quote" },
  },
  promo: {
    title: "Contractor or civil buyer?",
    body: "Register a trade account for 8% (Contractor/Trade) or 15% (Volume/Civil Bulk) off list pricing, plus standing delivery addresses and PO-based billing.",
    cta: { label: "Open a Trade Account", href: "/account/apply" },
  },
  slideshow: { enabled: true, intervalSeconds: 6, slides: DEFAULT_SLIDES.map((slide) => ({ ...slide, enabled: true })) },
};

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const saved = (await apiCached<Partial<SiteContent>>("/content")) ?? {};
  return { ...DEFAULT_CONTENT, ...saved };
});

type Overlay = {
  sku: string;
  isActive: boolean;
  description: string | null;
  featuredRank: number | null;
  images: { id: string; altText: string | null }[];
};

export type MerchandisedProduct = Product & {
  description: string | null;
  featuredRank: number | null;
  images: { src: string; alt: string }[];
};

const getOverlay = cache(async () => new Map(((await apiCached<Overlay[]>("/merchandising/products")) ?? []).map((o) => [o.sku, o])));

export type MerchandisedPackagedProduct = PackagedProduct & {
  description: string | null;
  featuredRank: number | null;
  images: { src: string; alt: string }[];
};

/** The visible CAT-10/11 packaged goods, with staff descriptions and photography. */
export const getPackagedCatalogue = cache(async (): Promise<MerchandisedPackagedProduct[]> => {
  const bySku = await getOverlay();
  return PACKAGED_PRODUCTS.filter((p) => bySku.get(p.sku)?.isActive ?? true).map((p) => {
    const o = bySku.get(p.sku);
    return {
      ...p,
      description: o?.description ?? null,
      featuredRank: o?.featuredRank ?? null,
      images: (o?.images ?? []).map((img) => ({ src: `/api/product-images/${img.id}`, alt: img.altText ?? p.name })),
    };
  });
});

/** The visible catalogue: workbook products minus hidden ones, with descriptions and photography. */
export const getCatalogue = cache(async (): Promise<MerchandisedProduct[]> => {
  const bySku = await getOverlay();
  return PRODUCTS.filter((p) => bySku.get(p.sku)?.isActive ?? true).map((p) => {
    const o = bySku.get(p.sku);
    return {
      ...p,
      description: o?.description ?? null,
      featuredRank: o?.featuredRank ?? null,
      images: (o?.images ?? []).map((img) => ({ src: `/api/product-images/${img.id}`, alt: img.altText ?? p.name })),
    };
  });
});

export async function getProduct(slug: string) {
  return (await getCatalogue()).find((p) => p.slug === slug);
}

/** SKUs staff have hidden — for client components that list products (calculators, quote form). */
export async function getHiddenSkus(): Promise<string[]> {
  const visible = new Set([...(await getCatalogue()), ...(await getPackagedCatalogue())].map((p) => p.sku));
  return [...PRODUCTS, ...PACKAGED_PRODUCTS].filter((p) => !visible.has(p.sku)).map((p) => p.sku);
}

/** The live slides: enabled ones whose photo is in the media library, in the saved order. */
export function slideshowSlides(slideshow: SlideshowContent) {
  if (!slideshow.enabled) return [];
  return slideshow.slides.flatMap((slide) => {
    const image = MEDIA_BY_ID.get(slide.imageId);
    if (!slide.enabled || !image) return [];
    return [{ id: `${slide.imageId}-${slide.caption}`, url: image.url, alt: image.alt, credit: image.credit, caption: slide.caption, href: slide.href }];
  });
}
