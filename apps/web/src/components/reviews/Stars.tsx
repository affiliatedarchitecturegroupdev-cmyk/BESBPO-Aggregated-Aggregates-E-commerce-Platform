import { Star } from "lucide-react";

/** Read-only stars for a rating out of 5 (half stars rounded to the nearest whole for display). */
export function Stars({ rating, size = "h-4 w-4", label }: { rating: number; size?: string; label?: string }) {
  const filled = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={label ?? `${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= filled ? "fill-ochre-gold text-ochre-gold" : "fill-transparent text-basalt/25"}`} aria-hidden="true" />
      ))}
    </span>
  );
}
