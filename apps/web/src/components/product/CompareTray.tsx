"use client";

import Link from "next/link";
import { compare, COMPARE_LIMIT, useCompare } from "@/lib/compare";
import { findQuotable } from "@/data/quotable";

/** A bar at the foot of the screen while products are ticked for comparison, linking to /compare. */
export function CompareTray() {
  const list = useCompare();
  if (list.length === 0) return null;
  return (
    <div role="region" aria-label="Compare products" className="fixed inset-x-0 bottom-0 z-40 border-t border-basalt/10 bg-white/95 shadow-lg backdrop-blur">
      {/* Right padding keeps the button clear of the floating "Ask us" assistant. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 py-3 pl-4 pr-28 md:pr-36">
        <p className="font-mono text-[10px] uppercase tracking-widest text-slate">
          Compare {list.length}/{COMPARE_LIMIT}
        </p>
        <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
          {list.map((sku) => (
            <li key={sku} className="flex max-w-[16rem] items-center gap-1 rounded-sm border border-basalt/10 px-2 py-1 font-body text-xs text-basalt">
              <span className="truncate">{findQuotable(sku)?.name ?? sku}</span>
              <button type="button" onClick={() => compare.remove(sku)} aria-label={`Remove ${findQuotable(sku)?.name ?? sku} from compare`} className="px-1 text-slate hover:text-basalt">
                ×
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => compare.clear()} className="font-body text-xs text-slate hover:text-basalt">
          Clear
        </button>
        <Link
          href={`/compare?skus=${list.map(encodeURIComponent).join(",")}`}
          aria-disabled={list.length < 2}
          className={`rounded-sm px-4 py-2 font-body text-sm font-semibold ${list.length < 2 ? "pointer-events-none bg-basalt/20 text-basalt/50" : "bg-seam-blue text-limestone hover:bg-basalt"}`}
        >
          {list.length < 2 ? "Pick one more" : `Compare ${list.length} →`}
        </Link>
      </div>
    </div>
  );
}
