import "server-only";
import { cache } from "react";
import { MEDIA_BY_ID } from "@/data/media";
import { apiCached } from "./api";

export type PromotionSlotKey = "HOMEPAGE_SECONDARY_BANNER" | "CATEGORY_TOP_BANNER" | "QUOTE_FLOW_UPSELL" | "FOOTER_STRIP";
export type Promotion = { id: string; slot: PromotionSlotKey; title: string; imageUrl: string; linkUrl: string | null };

export const PROMOTION_SLOTS: { slot: PromotionSlotKey; label: string; where: string }[] = [
  { slot: "HOMEPAGE_SECONDARY_BANNER", label: "Homepage banner", where: "Homepage, between Featured Products and Industries We Serve" },
  { slot: "CATEGORY_TOP_BANNER", label: "Category banner", where: "Top of a category listing" },
  { slot: "QUOTE_FLOW_UPSELL", label: "Quote upsell", where: "Quote request page, above the form" },
  { slot: "FOOTER_STRIP", label: "Footer strip", where: "Above the footer on every page" },
];

/** The live creative per slot (the ad system). Empty when the API can't be reached — slots simply don't render. */
export const getActivePromotions = cache(async () => (await apiCached<Partial<Record<PromotionSlotKey, Promotion>>>("/promotions/active")) ?? {});

/** A promotion or blog image: "media:<id>" from the licensed library, or an https URL. */
export function resolveImage(ref: string | null | undefined): { src: string; alt?: string; credit?: string } | null {
  if (!ref) return null;
  if (ref.startsWith("media:")) {
    const image = MEDIA_BY_ID.get(ref.slice("media:".length));
    return image ? { src: image.url, alt: image.alt, credit: image.credit } : null;
  }
  return /^https:\/\//.test(ref) ? { src: ref } : null;
}
