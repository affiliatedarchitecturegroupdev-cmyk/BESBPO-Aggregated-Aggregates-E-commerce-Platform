"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PRODUCTS, type Unit } from "@/data/catalogue";
import { CORE_CATEGORIES } from "@/data/categories";
import { estimateDelivery, estimateLine, formatZAR, UNIT_LABELS } from "@/lib/pricing";

/**
 * The homepage's above-the-fold estimator (wireframe 01): product, quantity
 * and delivery distance to a retail estimate in one row, handing off to the
 * product page's full calculator.
 */
export function QuickTonnageCalculator({ hiddenSkus = [] }: { hiddenSkus?: string[] }) {
  const available = PRODUCTS.filter((p) => !hiddenSkus.includes(p.sku));
  const [sku, setSku] = useState(available.find((p) => p.slug === "river-sand-washed")?.sku ?? available[0].sku);
  const product = available.find((p) => p.sku === sku) ?? available[0];
  const [unit, setUnit] = useState<Unit>(product.units[0]);
  const [quantity, setQuantity] = useState(6);
  const [distanceKm, setDistanceKm] = useState(20);

  const activeUnit = product.units.includes(unit) ? unit : product.units[0];
  const result = useMemo(() => {
    if (quantity <= 0) return null;
    const line = estimateLine(product, quantity, activeUnit, "RETAIL");
    const delivery = estimateDelivery({
      distanceKm,
      tierName: "RETAIL",
      bulkM3: activeUnit === "bag" ? 0 : line.m3,
      bulkTons: activeUnit === "bag" ? 0 : line.tons,
      baggedKg: line.baggedKg,
      totalM3: line.m3,
    });
    return { line, delivery };
  }, [product, quantity, activeUnit, distanceKm]);

  return (
    <section className="border-b border-seam-blue/20 bg-seam-blue/10">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Quick Tonnage Calculator</p>
        <div className="mt-3 grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr_1.4fr] md:items-end">
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Product</span>
            <select
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm"
            >
              {CORE_CATEGORIES.map((category) => (
                <optgroup key={category.slug} label={category.name}>
                  {available.filter((p) => p.categorySlug === category.slug).map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Quantity</span>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Unit</span>
            <select
              value={activeUnit}
              onChange={(e) => setUnit(e.target.value as Unit)}
              className="mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm"
            >
              {product.units.map((u) => (
                <option key={u} value={u}>
                  {u === "bag" ? `bags (${product.bagWeightKg}kg)` : UNIT_LABELS[u]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase text-slate">Delivery distance (km)</span>
            <input
              type="number"
              min={0}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Math.max(0, Number(e.target.value)))}
              className="mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm"
            />
          </label>
          <div className="rounded-sm bg-basalt px-4 py-2.5 font-body text-sm text-limestone" aria-live="polite">
            {!result ? (
              <span className="text-limestone/70">Enter a quantity</span>
            ) : result.delivery.isQuoteOnly ? (
              <Link href={`/quote?sku=${sku}&unit=${activeUnit}&qty=${quantity}`} className="text-ochre-gold hover:underline">
                Quoted individually — request a quote →
              </Link>
            ) : (
              <>
                <span className="block text-[11px] text-limestone/60">Estimated, incl. delivery</span>
                <span className="font-semibold">{formatZAR(result.line.total + result.delivery.fee)}</span>
                <Link href={`/products/${product.slug}`} className="ml-2 text-xs text-ochre-gold hover:underline">
                  Details →
                </Link>
              </>
            )}
          </div>
        </div>
        {result && (
          <p className="mt-2 font-body text-xs text-slate">
            ≈ {result.line.tons.toFixed(2)} tons ⇄ {result.line.m3.toFixed(2)} m³ at retail list price. Distance is
            measured from the nearest approved partner supplier; trade accounts save 8–15%.
          </p>
        )}
      </div>
    </section>
  );
}
