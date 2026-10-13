import { apiCached } from "@/lib/api";
import { REVIEWS_TAG } from "@/lib/reviews";

export const revalidate = 60;

/** Average stars and rating count per SKU (PRODUCT_REVIEWS.md) — one small, cached file for every product card on a page. */
export async function GET() {
  const summaries = (await apiCached<Record<string, { average: number; count: number }>>("/reviews/summaries", 60, [REVIEWS_TAG])) ?? {};
  return Response.json(summaries, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}
