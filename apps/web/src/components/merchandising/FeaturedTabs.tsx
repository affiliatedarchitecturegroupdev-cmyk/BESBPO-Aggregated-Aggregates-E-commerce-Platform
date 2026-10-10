"use client";

import Link from "next/link";
import { Children, useState, type ReactNode } from "react";

export type FeaturedTab = { key: string; label: string; href: string; cta: string };

/** Tabs over server-rendered panels: every panel is in the page, only the chosen one shows. */
export function FeaturedTabs({ tabs, children }: { tabs: FeaturedTab[]; children: ReactNode }) {
  const [index, setIndex] = useState(0);
  const panels = Children.toArray(children);
  const tab = tabs[index];
  return (
    <div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Featured product lines" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {tabs.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`featured-tab-${t.key}`}
              aria-selected={i === index}
              aria-controls={`featured-panel-${t.key}`}
              onClick={() => setIndex(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setIndex((index + 1) % tabs.length);
                if (e.key === "ArrowLeft") setIndex((index - 1 + tabs.length) % tabs.length);
              }}
              className={`shrink-0 rounded-sm px-3 py-1.5 font-body text-sm ${i === index ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white text-basalt hover:border-seam-blue"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link href={tab.href} className="font-body text-sm text-seam-blue hover:underline">
          {tab.cta} →
        </Link>
      </div>
      {panels.map((panel, i) => (
        <div
          key={tabs[i]?.key ?? i}
          id={`featured-panel-${tabs[i]?.key}`}
          role="tabpanel"
          aria-labelledby={`featured-tab-${tabs[i]?.key}`}
          hidden={i !== index}
          className="mt-6"
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
