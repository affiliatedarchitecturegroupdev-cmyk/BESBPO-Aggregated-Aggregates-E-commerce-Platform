"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { MaterialSwatch } from "@/components/product/MaterialSwatch";

export type CategoryCard = { key: string; href: string; name: string; description: string; meta: string };
export type CategoryPage = { label: string; summary: string; cards: CategoryCard[] };

const arrow =
  "flex h-9 w-9 items-center justify-center rounded-full border border-basalt/20 bg-white font-mono text-lg text-basalt hover:border-seam-blue hover:text-seam-blue disabled:opacity-30 disabled:hover:border-basalt/20 disabled:hover:text-basalt";

/**
 * The category cards a page at a time (nine on desktop, a 3 × 3 grid): tabs
 * name each page, arrows and dots step through them, and a swipe works on
 * touch screens. No autoplay — it's a menu, not an advert.
 */
export function CategoryCarousel({ pages, total }: { pages: CategoryPage[]; total: number }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);
  const go = (next: number) => setIndex(Math.max(0, Math.min(pages.length - 1, next)));

  return (
    <div
      aria-roledescription="carousel"
      aria-label="Product categories"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <p className="mt-1 font-body text-sm text-slate">
        {total} categories. {pages[index].summary}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Category groups" className="flex flex-wrap gap-2">
          {pages.map((page, i) => (
            <button
              key={page.label}
              type="button"
              role="tab"
              id={`category-tab-${i}`}
              aria-selected={i === index}
              aria-controls={`category-page-${i}`}
              onClick={() => go(i)}
              className={`rounded-sm px-3 py-1.5 font-body text-sm ${i === index ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white text-basalt hover:border-seam-blue"}`}
            >
              {page.label} <span className={`font-mono text-[11px] ${i === index ? "text-limestone/70" : "text-slate"}`}>{page.cards.length}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous categories" onClick={() => go(index - 1)} disabled={index === 0} className={arrow}>
            ‹
          </button>
          <span className="font-mono text-xs text-slate" aria-live="polite">
            {index + 1} / {pages.length}
          </span>
          <button type="button" aria-label="More categories" onClick={() => go(index + 1)} disabled={index === pages.length - 1} className={arrow}>
            ›
          </button>
        </div>
      </div>

      <div
        className="mt-6 overflow-hidden"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        <div className="flex items-start transition-transform duration-500 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
          {pages.map((page, i) => (
            <div
              key={page.label}
              id={`category-page-${i}`}
              role="tabpanel"
              aria-labelledby={`category-tab-${i}`}
              aria-hidden={i !== index}
              className="grid w-full shrink-0 grid-cols-2 gap-4 sm:grid-cols-3"
            >
              {page.cards.map((card) => (
                <Link
                  key={card.key}
                  href={card.href}
                  tabIndex={i === index ? undefined : -1}
                  className="group flex flex-col overflow-hidden rounded-sm border border-basalt/10 bg-white transition hover:border-seam-blue hover:shadow-sm"
                >
                  <MaterialSwatch sku={card.key} categorySlug={card.key} className="h-20 rounded-none" grains={70} />
                  <div className="flex flex-1 flex-col p-4">
                    <p className="font-body text-sm font-semibold text-basalt group-hover:text-seam-blue">{card.name}</p>
                    <p className="mt-1 line-clamp-3 flex-1 font-body text-xs text-slate">{card.description}</p>
                    <p className="mt-3 font-mono text-[11px] text-slate">{card.meta}</p>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex justify-center gap-2" aria-hidden>
        {pages.map((page, i) => (
          <button
            key={page.label}
            type="button"
            tabIndex={-1}
            onClick={() => go(i)}
            className={`h-1.5 w-8 rounded-full transition-colors ${i === index ? "bg-ochre-gold" : "bg-basalt/20 hover:bg-basalt/40"}`}
          />
        ))}
      </div>
    </div>
  );
}
