import "server-only";
import { apiCached } from "@/lib/api";

export type ReviewSummary = { average: number | null; count: number; written: number; distribution: Record<"1" | "2" | "3" | "4" | "5", number> };
export type PublicReview = { id: string; rating: number; title: string | null; body: string; createdAt: string; updatedAt: string; reviewer: string; verifiedPurchase: boolean };
export type ProductReviewsData = { sku: string; summary: ReviewSummary; reviews: PublicReview[] };

/** Cache tag for review data — cleared when a customer saves or staff moderate a review. */
export const REVIEWS_TAG = "reviews";

/** A product's published reviews (PRODUCT_REVIEWS.md), cached for a minute; null when the API can't be reached. */
export function getProductReviews(sku: string) {
  return apiCached<ProductReviewsData>(`/reviews/products/${encodeURIComponent(sku)}`, 60, [REVIEWS_TAG]);
}
