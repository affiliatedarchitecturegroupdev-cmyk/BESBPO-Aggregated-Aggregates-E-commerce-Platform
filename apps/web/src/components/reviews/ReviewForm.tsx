"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { deleteMyReview, loadMyReview, saveMyReview, type MyReview } from "@/app/reviews/actions";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

/**
 * The customer's own rating and review. Anyone signed in can give stars; the
 * written review opens once they've bought and paid for the product on their
 * account (the API checks this too).
 */
export function ReviewForm({ sku, slug, productName }: { sku: string; slug: string; productName: string }) {
  const [state, setState] = useState<MyReview | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    loadMyReview(sku).then((mine) => {
      setState(mine);
      if (mine.review) {
        setRating(mine.review.rating);
        setTitle(mine.review.title ?? "");
        setBody(mine.review.body ?? "");
      }
    });
  }, [sku]);

  const box = "rounded-sm border border-basalt/10 bg-white p-5";
  if (!state) return <div className={`${box} font-body text-sm text-slate`}>Loading…</div>;
  if (!state.signedIn) {
    return (
      <div className={box}>
        <p className="font-body text-sm font-semibold text-basalt">Rate this product</p>
        <p className="mt-1 font-body text-xs text-slate">Sign in to give it stars. Customers who have bought and paid for it can also write a review.</p>
        <Link href={`/account/login?next=${encodeURIComponent(`/products/${slug}#reviews`)}`} className="mt-3 inline-block rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">
          Sign in to rate
        </Link>
      </div>
    );
  }

  const shown = hover || rating;
  return (
    <form
      className={box}
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating) return setMessage({ error: "Choose from 1 to 5 stars." });
        start(async () => {
          const result = await saveMyReview(sku, slug, { rating, title: state.canWrite ? title : undefined, body: state.canWrite ? body : undefined });
          setMessage(result);
          if (!result.error) setState(await loadMyReview(sku));
        });
      }}
    >
      <p className="font-body text-sm font-semibold text-basalt">{state.review ? "Your rating" : "Rate this product"}</p>
      <div className="mt-2 flex items-center gap-1" role="radiogroup" aria-label={`Your rating for ${productName}`} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""} — ${LABELS[n]}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-sm p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-seam-blue"
          >
            <Star className={`h-7 w-7 ${n <= shown ? "fill-ochre-gold text-ochre-gold" : "fill-transparent text-basalt/30"}`} aria-hidden="true" />
          </button>
        ))}
        <span className="ml-2 font-body text-xs text-slate">{shown ? LABELS[shown] : ""}</span>
      </div>

      {state.canWrite ? (
        <div className="mt-4 space-y-3">
          <p className="font-body text-xs text-emerald-700">✓ You bought this on order {state.purchase?.orderNumber} — your review will show as a verified purchase.</p>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Title (optional)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Your review (optional)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Quality, grading, delivery, how it worked on site…"
              className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
            />
          </label>
          <p className="font-body text-[11px] text-slate">Shown with your first name and initial. Don&apos;t include phone numbers, emails or links — they&apos;re removed.</p>
        </div>
      ) : (
        <p className="mt-3 font-body text-xs text-slate">A written review opens once you&apos;ve bought and paid for this product on your account, so every review comes from a real purchase.</p>
      )}

      {state.review?.status === "HIDDEN" && (
        <p className="mt-3 rounded-sm bg-amber-50 p-2 font-body text-xs text-amber-800">Our team has hidden your review: {state.review.hiddenReason}. You can edit it and we&apos;ll look again.</p>
      )}
      {message && <p role="status" className={`mt-3 font-body text-xs ${message.error ? "text-red-700" : "text-emerald-700"}`}>{message.error ?? message.success}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50">
          {pending ? "Saving…" : state.review ? "Update" : state.canWrite && body.trim() ? "Publish review" : "Save rating"}
        </button>
        {state.review && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const result = await deleteMyReview(sku, slug);
                setMessage(result);
                if (!result.error) {
                  setRating(0);
                  setTitle("");
                  setBody("");
                  setState(await loadMyReview(sku));
                }
              })
            }
            className="font-body text-xs text-slate hover:text-red-700"
          >
            Remove
          </button>
        )}
      </div>
    </form>
  );
}
