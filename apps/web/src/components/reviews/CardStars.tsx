"use client";

import { useEffect, useState } from "react";
import { Stars } from "./Stars";

type Summaries = Record<string, { average: number; count: number }>;

// One request per page load, shared by every card on the page.
let summaries: Promise<Summaries> | null = null;
function loadSummaries() {
  summaries ??= fetch("/api/reviews/summaries")
    .then((r) => (r.ok ? (r.json() as Promise<Summaries>) : {}))
    .catch(() => ({}));
  return summaries;
}

/** A product card's stars and rating count; nothing until the product has a rating. */
export function CardStars({ sku }: { sku: string }) {
  const [summary, setSummary] = useState<{ average: number; count: number } | null>(null);
  useEffect(() => {
    let live = true;
    loadSummaries().then((all) => live && setSummary(all[sku] ?? null));
    return () => {
      live = false;
    };
  }, [sku]);
  if (!summary || summary.count === 0) return null;
  return (
    <span className="mt-1 flex items-center gap-1 font-body text-[11px] text-slate">
      <Stars rating={summary.average} size="h-3.5 w-3.5" label={`Rated ${summary.average} out of 5 from ${summary.count} ${summary.count === 1 ? "rating" : "ratings"}`} />
      <span aria-hidden="true">
        {summary.average.toFixed(1)} ({summary.count})
      </span>
    </span>
  );
}
