import { getProductReviews } from "@/lib/reviews";
import { ReviewForm } from "./ReviewForm";
import { Stars } from "./Stars";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });

/**
 * Ratings and reviews for a product (PRODUCT_REVIEWS.md): the average over
 * every published rating, the spread, the written reviews (each from a paid
 * order — "Verified purchase") and the customer's own rating/review form.
 */
export async function ProductReviews({ sku, slug, productName }: { sku: string; slug: string; productName: string }) {
  const data = await getProductReviews(sku);
  const summary = data?.summary;
  const reviews = data?.reviews ?? [];
  return (
    <section id="reviews" className="mt-16 scroll-mt-24">
      <h2 className="font-display text-xl font-bold text-basalt">Ratings &amp; reviews</h2>
      <div className="mt-5 grid gap-8 md:grid-cols-3">
        <div className="min-w-0 space-y-5">
          {summary && summary.count > 0 && summary.average !== null ? (
            <div className="rounded-sm border border-basalt/10 bg-white p-5">
              <p className="font-display text-4xl font-bold text-basalt">{summary.average.toFixed(1)}</p>
              <Stars rating={summary.average} size="h-5 w-5" />
              <p className="mt-1 font-body text-xs text-slate">
                {summary.count} {summary.count === 1 ? "rating" : "ratings"} · {summary.written} written {summary.written === 1 ? "review" : "reviews"}
              </p>
              <ul className="mt-4 space-y-1">
                {(["5", "4", "3", "2", "1"] as const).map((n) => {
                  const share = summary.count ? Math.round((summary.distribution[n] / summary.count) * 100) : 0;
                  return (
                    <li key={n} className="flex items-center gap-2 font-body text-xs text-slate">
                      <span className="w-8">{n} ★</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-basalt/10" aria-hidden="true">
                        <span className="block h-full bg-ochre-gold" style={{ width: `${share}%` }} />
                      </span>
                      <span className="w-8 text-right tabular-nums">{summary.distribution[n]}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm text-slate">No ratings yet — be the first.</p>
          )}
          <ReviewForm sku={sku} slug={slug} productName={productName} />
        </div>

        <div className="min-w-0 md:col-span-2">
          {reviews.length > 0 ? (
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-sm border border-basalt/10 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Stars rating={r.rating} />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-700">✓ Verified purchase</span>
                  </div>
                  {r.title && <h3 className="mt-2 font-body text-sm font-semibold text-basalt">{r.title}</h3>}
                  <p className="mt-1 whitespace-pre-line font-body text-sm text-basalt">{r.body}</p>
                  <p className="mt-3 font-body text-xs text-slate">
                    {r.reviewer} · {day(r.createdAt)}
                    {r.updatedAt.slice(0, 10) !== r.createdAt.slice(0, 10) ? " (edited)" : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-body text-sm text-slate">
              No written reviews yet. Written reviews come only from customers who bought and paid for this product through their account, so every one is a
              verified purchase.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
