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

/**
 * schema.org fields for a product's reviews, spread into its Product data so
 * search engines can show stars (PRODUCT_REVIEWS.md): the aggregate over every
 * published rating, and up to five written reviews. Empty when there are no
 * ratings — never a made-up or default rating.
 */
export function reviewStructuredData(data: ProductReviewsData | null) {
  if (!data || data.summary.count === 0 || data.summary.average === null) return {};
  return {
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: data.summary.average.toFixed(1),
      bestRating: "5",
      worstRating: "1",
      ratingCount: data.summary.count,
      ...(data.summary.written > 0 ? { reviewCount: data.summary.written } : {}),
    },
    ...(data.reviews.length > 0
      ? {
          review: data.reviews.slice(0, 5).map((r) => ({
            "@type": "Review",
            reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5", worstRating: "1" },
            author: { "@type": "Person", name: r.reviewer },
            datePublished: r.createdAt.slice(0, 10),
            ...(r.title ? { name: r.title } : {}),
            reviewBody: r.body,
          })),
        }
      : {}),
  };
}
