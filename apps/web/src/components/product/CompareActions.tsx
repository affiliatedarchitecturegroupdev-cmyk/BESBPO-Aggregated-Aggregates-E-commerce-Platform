"use client";

import Link from "next/link";
import { compare } from "@/lib/compare";

/** Under the comparison: clear the list and go back to shopping. */
export function CompareActions({ skus }: { skus: string[] }) {
  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href="/products" className="rounded-sm border border-basalt/20 px-4 py-2 font-body text-sm font-semibold text-basalt hover:border-seam-blue">
        ← Keep shopping
      </Link>
      <button
        type="button"
        onClick={() => {
          for (const sku of skus) compare.remove(sku);
        }}
        className="rounded-sm px-4 py-2 font-body text-sm text-slate hover:text-basalt"
      >
        Clear comparison
      </button>
    </div>
  );
}
