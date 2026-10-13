import { getProductReviews } from "@/lib/reviews";
import { Stars } from "./Stars";

/** Under a product's name: its average and number of ratings, linking to the reviews — or an invitation to be the first. */
export async function RatingSummaryLink({ sku }: { sku: string }) {
  const data = await getProductReviews(sku);
  if (!data) return null;
  const { average, count, written } = data.summary;
  return (
    <a href="#reviews" className="mt-2 inline-flex items-center gap-2 font-body text-xs text-slate hover:text-seam-blue">
      {average !== null && count > 0 ? (
        <>
          <Stars rating={average} />
          <span>
            <span className="font-semibold text-basalt">{average.toFixed(1)}</span> · {count} {count === 1 ? "rating" : "ratings"}
            {written > 0 ? `, ${written} ${written === 1 ? "review" : "reviews"}` : ""}
          </span>
        </>
      ) : (
        <span className="underline">Be the first to rate this product</span>
      )}
    </a>
  );
}
