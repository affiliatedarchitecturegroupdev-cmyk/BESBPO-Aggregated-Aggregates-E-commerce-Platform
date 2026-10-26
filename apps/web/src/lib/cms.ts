import "server-only";
import { draftMode } from "next/headers";
import { cache } from "react";
import { PRODUCTS, type DeliveryRules, type Product } from "@/data/catalogue";
import { DEFAULT_SLIDES, MEDIA_BY_ID } from "@/data/media";
import { PACKAGED_PRODUCTS, type PackagedProduct } from "@/data/packaged";
import { MASONRY_PRODUCTS, type MasonryProduct } from "@/data/masonry";
import { ROOFING_PRODUCTS, type RoofingProduct } from "@/data/roofing";
import { SUPPLIES_PRODUCTS } from "@/data/supplies";
import type { Quotable } from "@/data/quotable";
import { STEEL_PRODUCTS, type SteelProduct } from "@/data/steel";
import { READY_MIX_PRODUCTS, type ReadyMixProduct } from "@/data/ready-mix";
import { addedProducts, type AddedProductSource } from "./added-products";
import { deliveryRulesFrom, type StaffDeliveryRates } from "./delivery-rates";
import { api, apiCached } from "./api";
import { applyLivePrices, livePriceMap, type LivePrice } from "./live-prices";
import type { LeadTime } from "./phase4";
import { sessionToken } from "./session";

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

// Every product family on the storefront (the hero quotes the total).
const PRODUCT_COUNT = PRODUCTS.length + PACKAGED_PRODUCTS.length + READY_MIX_PRODUCTS.length + STEEL_PRODUCTS.length + MASONRY_PRODUCTS.length + ROOFING_PRODUCTS.length + SUPPLIES_PRODUCTS.length;

export const DEFAULT_CONTENT: SiteContent = {
  announcement: { enabled: false, message: "" },
  hero: {
    eyebrow: "Foundations to Roof · SANS Graded",
    headline: "Every Layer Starts Here.",
    body: `Aggregates and sand, cement and ready-mix, steel, bricks and blocks, paving, drainage, roofing and timber, and the building supplies that finish the job — ${PRODUCT_COUNT} products, many priced to buy online and the rest quoted fast, delivered from the approved partner supplier nearest your site, anywhere in South Africa.`,
    primaryCta: { label: "Shop All Departments", href: "/departments" },
    secondaryCta: { label: "Request a Bulk Quote", href: "/quote" },
  },
  promo: {
    title: "Contractor or civil buyer?",
    body: "Register a trade account for up to 8% (Contractor/Trade) or 15% (Volume/Civil Bulk) off list pricing, standing delivery addresses, and trade credit on account once approved.",
    cta: { label: "Open a Trade Account", href: "/account/apply" },
  },
  slideshow: { enabled: true, intervalSeconds: 6, slides: DEFAULT_SLIDES.map((slide) => ({ ...slide, enabled: true })) },
};

export const getSiteContent = cache(async (): Promise<SiteContent> => {
  const saved = (await apiCached<Partial<SiteContent>>("/content")) ?? {};
  return { ...DEFAULT_CONTENT, ...saved };
});

/** Lead times staff set per category (SiteContent "lead-times"). Empty when none are set — nothing is guessed. */
export const getLeadTimes = cache(async (): Promise<Map<string, LeadTime>> => {
  const saved = await apiCached<{ "lead-times"?: { items?: LeadTime[] } }>("/content");
  return new Map((saved?.["lead-times"]?.items ?? []).map((t) => [t.categorySlug, t]));
});

type Overlay = {
  sku: string;
  isActive: boolean;
  description: string | null;
  featuredRank: number | null;
  /** When the product was added to the store's database (for "New in store"). */
  createdAt?: string;
  images: {
    id: string;
    altText: string | null;
    licence?: "CLEARED" | "PERMISSION_PENDING";
    licenceName?: string | null;
    licenceUrl?: string | null;
    credit?: string | null;
    sourceUrl?: string | null;
  }[];
};

/** The credit an open-licence photo's licence requires next to it (see /photo-credits). */
export type PhotoCredit = { text: string; licence: string; licenceUrl: string | null; sourceUrl: string | null };

/** A product photo as the storefront shows it; `pending` only ever appears in a staff preview. */
export type ProductPhoto = { src: string; alt: string; pending?: boolean; credit?: PhotoCredit };

export type MerchandisedProduct = Product & {
  description: string | null;
  featuredRank: number | null;
  images: ProductPhoto[];
};

/**
 * Staff photo preview (Next.js draft mode, switched on at /api/preview/photos
 * by a signed-in staff member): that one browser gets an uncached overlay that
 * includes photos still awaiting permission. Everyone else — and any request
 * without a staff session — gets the normal cached, cleared-only catalogue.
 */
export function isPhotoPreview(): boolean {
  return draftMode().isEnabled;
}

const getOverlay = cache(async () => {
  if (isPhotoPreview()) {
    const staff = await api<Overlay[]>("/merchandising/staff/products", { token: sessionToken() });
    if (staff.ok) return new Map(staff.data.map((o) => [o.sku, o]));
  }
  return new Map(((await apiCached<Overlay[]>("/merchandising/products")) ?? []).map((o) => [o.sku, o]));
});

const photos = (o: Overlay | undefined, name: string): ProductPhoto[] =>
  (o?.images ?? []).map((img) => ({
    src: `/api/product-images/${img.id}`,
    alt: img.altText ?? name,
    ...(img.licence === "PERMISSION_PENDING" ? { pending: true } : {}),
    ...(img.credit && img.licenceName
      ? { credit: { text: img.credit, licence: img.licenceName, licenceUrl: img.licenceUrl ?? null, sourceUrl: img.sourceUrl ?? null } }
      : {}),
  }));

/** When each product was added to the store, by SKU — empty when the API can't be reached. */
export async function getAddedDates(): Promise<Map<string, Date>> {
  const overlay = await getOverlay();
  return new Map([...overlay.values()].filter((o) => o.createdAt).map((o) => [o.sku, new Date(o.createdAt!)]));
}

/** A product's lead photo, for thumbnails anywhere on the site (ProductThumb). */
export type LeadPhoto = { src: string; alt: string };

/**
 * Every product's lead (first) cleared photo, keyed by SKU — the one place
 * thumbnails get their pictures, so recently viewed, recommendations, search,
 * cart and checkout show the same photo as the product page. Cached like the
 * rest of the catalogue; photos awaiting permission are never included.
 */
export const getLeadPhotos = cache(async (): Promise<Record<string, LeadPhoto>> => {
  const overlays = (await apiCached<Overlay[]>("/merchandising/products")) ?? [];
  const map: Record<string, LeadPhoto> = {};
  for (const o of overlays) {
    const img = o.images.find((i) => i.licence !== "PERMISSION_PENDING");
    if (img && o.isActive) map[o.sku] = { src: `/api/product-images/${img.id}`, alt: img.altText ?? "" };
  }
  return map;
});

/**
 * Sell prices staff approved from supplier price lists (docs/supplier-prices.md) — the price at each tier, never
 * costs or suppliers. Cached for a minute; approving or withdrawing one refreshes it straight away.
 */
export const getLivePrices = cache(async (): Promise<LivePrice[]> => {
  const list = await apiCached<LivePrice[]>("/prices/live", 60, ["prices"]);
  return Array.isArray(list) ? list : [];
});

const getLivePriceMap = cache(async () => livePriceMap(await getLivePrices()));

export type MerchandisedPackagedProduct = PackagedProduct & {
  description: string | null;
  featuredRank: number | null;
  images: ProductPhoto[];
};

/** The visible CAT-10/11 packaged goods, with staff descriptions and photography. */
export const getPackagedCatalogue = cache(async (): Promise<MerchandisedPackagedProduct[]> => {
  const [bySku, live] = await Promise.all([getOverlay(), getLivePriceMap()]);
  return PACKAGED_PRODUCTS.filter((p) => bySku.get(p.sku)?.isActive ?? true).map((p) => {
    const o = bySku.get(p.sku);
    return applyLivePrices({
      ...p,
      description: o?.description ?? null,
      featuredRank: o?.featuredRank ?? null,
      images: photos(o, p.name),
    }, live);
  });
});

export type MerchandisedReadyMixProduct = ReadyMixProduct & {
  description: string | null;
  featuredRank: number | null;
  images: ProductPhoto[];
};

/** The visible CAT-12 ready-mix grades, with staff descriptions and photography. */
export const getReadyMixCatalogue = cache(async (): Promise<MerchandisedReadyMixProduct[]> => {
  const bySku = await getOverlay();
  return READY_MIX_PRODUCTS.filter((p) => bySku.get(p.sku)?.isActive ?? true).map((p) => {
    const o = bySku.get(p.sku);
    return { ...p, description: o?.description ?? null, featuredRank: o?.featuredRank ?? null, images: photos(o, p.name) };
  });
});

export type MerchandisedSteelProduct = SteelProduct & {
  description: string | null;
  featuredRank: number | null;
  images: ProductPhoto[];
};

/** The visible CAT-15..18 steel products, with staff descriptions and photography. */
export const getSteelCatalogue = cache(async (): Promise<MerchandisedSteelProduct[]> => {
  const [bySku, live] = await Promise.all([getOverlay(), getLivePriceMap()]);
  return STEEL_PRODUCTS.filter((p) => bySku.get(p.sku)?.isActive ?? true).map((p) => {
    const o = bySku.get(p.sku);
    return applyLivePrices({ ...p, description: o?.description ?? null, featuredRank: o?.featuredRank ?? null, images: photos(o, p.name) }, live);
  });
});

export type MerchandisedMasonryProduct = MasonryProduct & {
  description: string | null;
  featuredRank: number | null;
  images: ProductPhoto[];
};

/** The visible CAT-19/20 masonry products, with staff descriptions and photography. */
export const getMasonryCatalogue = cache(async (): Promise<MerchandisedMasonryProduct[]> => {
  const [bySku, live] = await Promise.all([getOverlay(), getLivePriceMap()]);
  return MASONRY_PRODUCTS.filter((p) => bySku.get(p.sku)?.isActive ?? true).map((p) => {
    const o = bySku.get(p.sku);
    return applyLivePrices({ ...p, description: o?.description ?? null, featuredRank: o?.featuredRank ?? null, images: photos(o, p.name) }, live);
  });
});

export type MerchandisedRoofingProduct = RoofingProduct & {
  description: string | null;
  featuredRank: number | null;
  images: ProductPhoto[];
};

/** The visible CAT-26..28 roofing products, with staff descriptions and photography. */
export const getRoofingCatalogue = cache(async (): Promise<MerchandisedRoofingProduct[]> => {
  const [bySku, live] = await Promise.all([getOverlay(), getLivePriceMap()]);
  return ROOFING_PRODUCTS.filter((p) => bySku.get(p.sku)?.isActive ?? true).map((p) => {
    const o = bySku.get(p.sku);
    return applyLivePrices({ ...p, description: o?.description ?? null, featuredRank: o?.featuredRank ?? null, images: photos(o, p.name) }, live);
  });
});

/**
 * Products staff added in Admin → Catalogue import (docs/catalogue-import.md) — read from the API, as they aren't in
 * the catalogue files. Only active ones are returned. Cached for a minute.
 */
export const getAddedProducts = cache(async (): Promise<RoofingProduct[]> => addedProducts(await apiCached<AddedProductSource[]>("/catalogue-import/products", 60, ["catalogue"])));

/** The delivery rates staff set in Admin → Delivery rates (docs/delivery-rates.md): tipper rules and flatbed fees. */
export const getDeliveryRates = cache(async (): Promise<{ rules: DeliveryRules; flatbed: StaffDeliveryRates["flatbed"] }> => {
  const rates = await apiCached<StaffDeliveryRates>("/pricing/delivery-rates", 60, ["delivery-rates"]);
  return { rules: deliveryRulesFrom(rates), flatbed: rates?.flatbed ?? {} };
});

/** The products staff added, as the cart and quote form look them up (findQuotable), with live supplier prices. */
export const getAddedQuotable = cache(async (): Promise<Quotable[]> => {
  const [added, live] = await Promise.all([getAddedProducts(), getLivePriceMap()]);
  return added.map((p) => {
    const priced = applyLivePrices(p, live);
    return { sku: p.sku, slug: p.slug, name: p.name, categorySlug: p.categorySlug, gradingStandard: p.gradingStandard, units: priced.units.map((u) => ({ code: u.unit, label: u.label, retailPrice: u.prices?.RETAIL ?? null })) };
  });
});

/** Building supplies (CAT-32..42 and the range), plus products staff added, visible ones only, with descriptions and photography — the roofing product shape. */
export const getSuppliesCatalogue = cache(async (): Promise<MerchandisedRoofingProduct[]> => {
  const [bySku, live, added] = await Promise.all([getOverlay(), getLivePriceMap(), getAddedProducts()]);
  return [...SUPPLIES_PRODUCTS, ...added].filter((p) => bySku.get(p.sku)?.isActive ?? true).map((p) => {
    const o = bySku.get(p.sku);
    return applyLivePrices({ ...p, description: o?.description ?? null, featuredRank: o?.featuredRank ?? null, images: photos(o, p.name) }, live);
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
      images: photos(o, p.name),
    };
  });
});

export async function getProduct(slug: string) {
  return (await getCatalogue()).find((p) => p.slug === slug);
}

/** SKUs staff have hidden — for client components that list products (calculators, quote form). */
export async function getHiddenSkus(): Promise<string[]> {
  const visible = new Set([...(await getCatalogue()), ...(await getPackagedCatalogue()), ...(await getReadyMixCatalogue()), ...(await getSteelCatalogue()), ...(await getMasonryCatalogue()), ...(await getRoofingCatalogue()), ...(await getSuppliesCatalogue())].map((p) => p.sku));
  return [...PRODUCTS, ...PACKAGED_PRODUCTS, ...READY_MIX_PRODUCTS, ...STEEL_PRODUCTS, ...MASONRY_PRODUCTS, ...ROOFING_PRODUCTS, ...SUPPLIES_PRODUCTS].filter((p) => !visible.has(p.sku)).map((p) => p.sku);
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
