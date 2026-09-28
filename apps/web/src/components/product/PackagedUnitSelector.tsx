"use client";

import Link from "next/link";
import { useState } from "react";
import { CUSTOMER_TIERS, type CustomerTierName } from "@/data/catalogue";
import type { PackagedProduct } from "@/data/packaged";
import { formatZAR } from "@/lib/pricing";

/**
 * Unit-of-sale selector for packaged goods — the counterpart of the
 * bulk/bag calculator. A benchmarked unit prices live at the chosen tier; a
 * unit without a confirmed price explains why and goes to the quote flow,
 * exactly as the pricing service does.
 */
export function PackagedUnitSelector({ product }: { product: PackagedProduct }) {
  const [index, setIndex] = useState(Math.max(0, product.units.findIndex((u) => u.prices !== null)));
  const [quantity, setQuantity] = useState(10);
  const [tierName, setTierName] = useState<CustomerTierName>("RETAIL");
  const unit = product.units[index];
  const unitPrice = unit.prices?.[tierName];
  const total = unitPrice !== undefined ? Math.round(quantity * Math.round(unitPrice * 100)) / 100 : null;
  const quoteHref = `/quote?sku=${product.sku}&unit=${unit.unit}&qty=${quantity}`;

  return (
    <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">Unit of Sale</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Unit of sale">
        {product.units.map((u, i) => (
          <button
            key={u.unit}
            type="button"
            aria-pressed={i === index}
            onClick={() => setIndex(i)}
            className={`rounded-sm border px-3 py-1.5 font-body text-xs ${i === index ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt"}`}
          >
            {u.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Quantity ({unit.label}s)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.round(Number(e.target.value) || 1)))}
            className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Customer tier</span>
          <select
            value={tierName}
            onChange={(e) => setTierName(e.target.value as CustomerTierName)}
            className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
          >
            {CUSTOMER_TIERS.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label} ({Math.round(t.discount * 100)}% off)
              </option>
            ))}
          </select>
        </label>
      </div>

      {unitPrice !== undefined && total !== null ? (
        <>
          <dl className="mt-4 space-y-1 font-body text-sm text-basalt">
            <div className="flex justify-between">
              <dt className="text-slate">Unit price</dt>
              <dd>{formatZAR(unitPrice)} / {unit.label}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-sm bg-basalt px-4 py-3 font-body text-sm text-limestone">
            Materials: <strong>{formatZAR(total)}</strong>
            <span className="block text-xs text-limestone/70">Delivery is added at checkout, per our bagged-goods rates.</span>
          </div>
          <p className="mt-2 font-mono text-[10px] text-slate">Benchmark: {unit.sourceNote}</p>
        </>
      ) : (
        <div className="mt-4 rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-3 font-body text-sm text-basalt">
          <p className="font-semibold">{unit.pricingStatus.startsWith("Quote-only") ? "Quote only" : "Price on request"}</p>
          <p className="mt-1 text-xs text-slate">{unit.sourceNote}</p>
        </div>
      )}
      <Link href={quoteHref} className="mt-4 inline-block rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
        {unitPrice !== undefined ? "Add to Quote Request" : "Request a Quote"}
      </Link>
      <p className="mt-2 font-body text-[11px] text-slate">
        Estimate only — every order is re-priced by our pricing service. We never publish a price we can&apos;t back with a
        real benchmark.
      </p>
    </div>
  );
}
