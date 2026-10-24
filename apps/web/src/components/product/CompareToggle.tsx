"use client";

import { useState } from "react";
import { compare, COMPARE_LIMIT, useCompare } from "@/lib/compare";

/** "Compare" checkbox on product cards and pages: adds the product to the compare list (up to three). */
export function CompareToggle({ sku, className = "" }: { sku: string; className?: string }) {
  const list = useCompare();
  const [full, setFull] = useState(false);
  const checked = list.includes(sku);
  return (
    <label className={`inline-flex cursor-pointer items-center gap-1.5 font-body text-xs text-slate hover:text-basalt ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={() => setFull(!compare.toggle(sku))}
        className="h-3.5 w-3.5 accent-seam-blue"
      />
      {full && !checked ? `Compare holds ${COMPARE_LIMIT} — remove one first` : "Compare"}
    </label>
  );
}
