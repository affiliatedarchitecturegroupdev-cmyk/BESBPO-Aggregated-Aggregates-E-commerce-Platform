"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES } from "@/data/categories";
import { useNearestDeliveryPoint } from "./useNearestDeliveryPoint";

/** Public finder on the delivery-areas page: how far is my site from the nearest partner supplier? */
export function NearestDeliveryPointFinder({ quoteOverKm }: { quoteOverKm: number }) {
  const [category, setCategory] = useState("");
  const { state, locate } = useNearestDeliveryPoint();
  return (
    <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
      <p className="font-body text-sm font-semibold text-basalt">How far is your site from the nearest supplier?</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Material</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 block rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm"
          >
            <option value="">Any material</option>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => locate(category || undefined)}
          disabled={state.status === "locating"}
          className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50"
        >
          {state.status === "locating" ? "Finding…" : "Use my location"}
        </button>
      </div>
      <div aria-live="polite" className="mt-3 font-body text-sm text-basalt">
        {state.status === "found" && (
          <p>
            Nearest partner supplier: <strong>{state.town}</strong>, {state.province} — about{" "}
            <strong>{state.distanceKm}km</strong> in a straight line.{" "}
            {state.distanceKm > quoteOverKm ? (
              <>
                That&apos;s beyond our {quoteOverKm}km delivery bands, so we&apos;ll quote it individually.{" "}
                <Link href="/quote" className="font-semibold text-seam-blue hover:underline">Request a quote →</Link>
              </>
            ) : (
              "Road distance is usually further; we confirm it when you order."
            )}
          </p>
        )}
        {state.status === "none" && (
          <p>
            We don&apos;t have a mapped supplier for that material yet.{" "}
            <Link href="/quote" className="font-semibold text-seam-blue hover:underline">Request a quote</Link> and we&apos;ll source it.
          </p>
        )}
        {state.status === "error" && <p className="text-slate">{state.message}</p>}
      </div>
      <p className="mt-2 font-body text-[11px] text-slate">Your location is used only for this lookup and isn&apos;t saved.</p>
    </div>
  );
}
