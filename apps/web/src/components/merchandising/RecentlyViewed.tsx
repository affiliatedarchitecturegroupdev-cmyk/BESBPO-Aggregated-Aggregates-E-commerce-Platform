"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductThumb } from "@/components/product/ProductThumb";
import { findQuotable } from "@/data/quotable";
import { formatZAR } from "@/lib/pricing";
import { recentlyViewed, useRecentlyViewed } from "@/lib/recently-viewed";

/**
 * Recently viewed (RECENTLY_VIEWED.md): the products this browser opened
 * last, as one sideways row. On a product page pass `current` — it is
 * recorded and left out of the row. Hidden products never show.
 */
export function RecentlyViewed({ current, hiddenSkus = [], className = "mt-16" }: { current?: string; hiddenSkus?: string[]; className?: string }) {
  const skus = useRecentlyViewed();
  // Prices staff approved from supplier lists since the catalogue was built (docs/supplier-prices.md).
  const [live, setLive] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    if (current) recentlyViewed.record(current);
  }, [current]);

  const shown = skus.filter((sku) => sku !== current && !hiddenSkus.includes(sku)).join(",");
  useEffect(() => {
    if (!shown) return;
    let cancelled = false;
    fetch(`/api/live-prices?skus=${encodeURIComponent(shown)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { prices?: Record<string, Record<string, number>> } | null) => {
        if (!cancelled && body?.prices) setLive(body.prices);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shown]);

  const items = skus.flatMap((sku) => {
    const found = sku === current || hiddenSkus.includes(sku) ? undefined : findQuotable(sku);
    if (!found) return [];
    const product = live[sku] ? { ...found, units: found.units.map((u) => ({ ...u, retailPrice: live[sku][u.code] ?? u.retailPrice })) } : found;
    const priced = product.units.filter((u) => u.retailPrice !== null).sort((a, b) => a.retailPrice! - b.retailPrice!);
    const unit = priced[0] ?? product.units[0];
    return [{ ...product, unit }];
  });
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recently-viewed" className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recently-viewed" className="font-display text-xl font-bold text-basalt">
          Recently viewed
        </h2>
        <button type="button" onClick={() => recentlyViewed.clear()} className="font-body text-xs text-slate hover:text-basalt hover:underline">
          Clear
        </button>
      </div>
      <ul className="-mx-4 mt-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0">
        {items.map((p) => (
          <li key={p.sku} className="w-56 shrink-0 snap-start">
            <Link
              href={`/products/${p.slug}`}
              className="group flex h-full overflow-hidden rounded-sm border border-basalt/10 bg-white transition hover:border-seam-blue hover:shadow-sm"
            >
              <ProductThumb sku={p.sku} categorySlug={p.categorySlug} name={p.name} className="w-14 shrink-0 rounded-none" grains={24} />
              <div className="flex min-w-0 flex-1 flex-col p-3">
                <p className="font-body text-sm font-semibold text-basalt group-hover:text-seam-blue">{p.name}</p>
                <p className="mt-auto pt-2 font-body text-xs text-slate">
                  {p.unit.retailPrice !== null ? (
                    <>
                      <strong className="text-basalt">{formatZAR(p.unit.retailPrice)}</strong> / {p.unit.label.replace(/\s*\(.*\)$/, "")}
                    </>
                  ) : (
                    <>Price on quote</>
                  )}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-1 font-body text-[11px] text-slate">Kept in this browser only — nothing is sent to us.</p>
    </section>
  );
}
