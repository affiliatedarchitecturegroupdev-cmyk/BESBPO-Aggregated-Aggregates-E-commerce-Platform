import "server-only";
import { cache } from "react";
import { MEDIA_BY_ID } from "@/data/media";
import { apiCached } from "./api";

export type PromotionSlotKey = "HOMEPAGE_SECONDARY_BANNER" | "CATEGORY_TOP_BANNER" | "QUOTE_FLOW_UPSELL" | "FOOTER_STRIP" | "GROUP_CROSS_SELL";
export type Promotion = {
  id: string;
  slot: PromotionSlotKey;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  categorySlug?: string | null;
  industrySlug?: string | null;
};

export const PROMOTION_SLOTS: { slot: PromotionSlotKey; label: string; where: string }[] = [
  { slot: "HOMEPAGE_SECONDARY_BANNER", label: "Homepage banner", where: "Homepage, between Featured Products and Industries We Serve" },
  { slot: "CATEGORY_TOP_BANNER", label: "Category banner", where: "Top of a category or industry listing — can target one category or industry" },
  { slot: "QUOTE_FLOW_UPSELL", label: "Quote upsell", where: "Quote request page, above the form" },
  { slot: "FOOTER_STRIP", label: "Footer strip", where: "Above the footer on every page" },
  {
    slot: "GROUP_CROSS_SELL",
    label: "Group cross-sell",
    where: "Homepage \"Need it built or finished?\" section — banners for Affiliated Builders or Finishes Construction (link to their sites)",
  },
];

/**
 * The live creative per slot (the ad system), for an optional category or
 * industry listing — the category banner can be targeted at either. Empty
 * when the API can't be reached: slots simply don't render.
 */
export const getActivePromotions = cache(async (context: { category?: string; industry?: string } = {}) => {
  const search = new URLSearchParams();
  if (context.category && /^[a-z0-9-]{1,60}$/.test(context.category)) search.set("category", context.category);
  if (context.industry && /^[a-z0-9-]{1,60}$/.test(context.industry)) search.set("industry", context.industry);
  const query = search.toString();
  return (await apiCached<Partial<Record<PromotionSlotKey, Promotion>>>(`/promotions/active${query ? `?${query}` : ""}`)) ?? {};
});

/** A promotion or blog image: "media:<id>" from the licensed library, "upload:<id>" from staff uploads, or an https URL. */
export function resolveImage(ref: string | null | undefined): { src: string; alt?: string; credit?: string } | null {
  if (!ref) return null;
  if (ref.startsWith("upload:")) {
    const id = ref.slice("upload:".length);
    return /^[a-z0-9]{10,40}$/.test(id) ? { src: `/api/media/${id}` } : null;
  }
  if (ref.startsWith("media:")) {
    const image = MEDIA_BY_ID.get(ref.slice("media:".length));
    return image ? { src: image.url, alt: image.alt, credit: image.credit } : null;
  }
  return /^https:\/\//.test(ref) ? { src: ref } : null;
}
