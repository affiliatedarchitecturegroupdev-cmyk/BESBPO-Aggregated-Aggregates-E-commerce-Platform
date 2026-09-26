"use client";

import { useMemo, useState } from "react";
import type { SampleProduct } from "@/data/products.sample";
import {
  applyTierDiscount,
  formatZAR,
  m3ToTons,
  tonsToM3,
  TIER_DISCOUNTS,
  VOLUME_CIVIL_BULK_THRESHOLD_M3,
  type CustomerTierName,
} from "@/lib/pricing";

type Unit = "ton" | "m3" | "bag";

/**
 * Module 1: Bulk / Bag Toggle + Tonnage-Volume Calculator. Converts live
 * between tons and m³ using the product's bulk density, and computes the
 * bagged price from the same base rate — the displayed price is never a
 * second, hand-maintained number.
 */
export function BulkBagCalculator({ product }: { product: SampleProduct }) {
  const [unit, setUnit] = useState<Unit>("ton");
  const [quantity, setQuantity] = useState(1);
  const [tier, setTier] = useState<CustomerTierName>("RETAIL");

  const result = useMemo(() => {
    let tons = 0;
    let m3 = 0;
    let unitPrice = 0;

    if (unit === "ton") {
      tons = quantity;
      m3 = tonsToM3(tons, product.bulkDensityKgPerM3);
      unitPrice = product.listPricePerTon;
    } else if (unit === "m3") {
      m3 = quantity;
      tons = m3ToTons(m3, product.bulkDensityKgPerM3);
      unitPrice = product.listPricePerM3;
    } else {
      unitPrice = product.listPricePerBag ?? 0;
      const totalKg = quantity * (product.bagWeightKg ?? 0);
      tons = totalKg / 1000;
      m3 = tonsToM3(tons, product.bulkDensityKgPerM3);
    }

    const subtotal = quantity * unitPrice;
    const total = applyTierDiscount(subtotal, tier);
    const isQuoteOnly = m3 >= VOLUME_CIVIL_BULK_THRESHOLD_M3;

    return { tons, m3, unitPrice, subtotal, total, isQuoteOnly };
  }, [unit, quantity, tier, product]);

  return (
    <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">Tonnage / Bag Calculator</p>

      <div className="mt-3 flex gap-2">
        {(["ton", "m3", ...(product.bagPremiumMultiplier ? (["bag"] as Unit[]) : [])] as Unit[]).map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={`rounded-sm border px-3 py-1.5 font-body text-xs ${
              unit === u ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt"
            }`}
          >
            {u === "ton" ? "Bulk (ton)" : u === "m3" ? "Bulk (m³)" : `Bagged (${product.bagWeightKg}kg)`}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Quantity ({unit})</span>
          <input
            type="number"
            min={0}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Customer Tier</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as CustomerTierName)}
            className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
          >
            {Object.keys(TIER_DISCOUNTS).map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")} ({TIER_DISCOUNTS[t as CustomerTierName]}% off)
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="mt-4 space-y-1 font-body text-sm text-basalt">
        <div className="flex justify-between">
          <dt className="text-slate">Equivalent</dt>
          <dd>
            {result.tons.toFixed(2)} tons &nbsp;⇄&nbsp; {result.m3.toFixed(2)} m³
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Unit price</dt>
          <dd>{formatZAR(result.unitPrice)}</dd>
        </div>
      </dl>

      {result.isQuoteOnly ? (
        <div className="mt-4 rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-3 font-body text-sm text-basalt">
          This is a Volume/Civil Bulk tier quantity (≥10m³) — pricing is quoted individually.{" "}
          <a href="/quote" className="font-semibold text-seam-blue hover:underline">Request a quote →</a>
        </div>
      ) : (
        <div className="mt-4 flex items-center justify-between rounded-sm bg-basalt px-4 py-3">
          <span className="font-body text-sm text-limestone/80">Subtotal: {formatZAR(result.total)}</span>
          <button className="rounded-sm bg-ochre-gold px-4 py-2 font-body text-xs font-semibold text-basalt">
            Add to Quote
          </button>
        </div>
      )}
    </div>
  );
}
