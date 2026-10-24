"use client";

import { useState, type ReactNode } from "react";

/** Tabs for "Trending in your province": one pre-rendered panel per province, switched without a page load. */
export function ProvinceTabs({ provinces, panels }: { provinces: string[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div role="tablist" aria-label="Province" className="flex flex-wrap gap-2">
        {provinces.map((p, i) => (
          <button
            key={p}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={`rounded-full px-3 py-1 font-body text-xs font-semibold ${i === active ? "bg-basalt text-limestone" : "border border-basalt/20 text-basalt hover:border-seam-blue"}`}
          >
            {p}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div key={provinces[i]} role="tabpanel" hidden={i !== active} className="mt-5">
          {panel}
        </div>
      ))}
    </div>
  );
}
