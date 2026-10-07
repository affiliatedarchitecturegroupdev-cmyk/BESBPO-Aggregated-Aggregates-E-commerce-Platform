"use client";

import Link from "next/link";
import { useState } from "react";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { CUSTOMER_TIERS, type CustomerTierName } from "@/data/catalogue";
import { isPumpPriced, PUMP_OPTIONS, type ReadyMixProduct } from "@/data/ready-mix";
import { formatZAR } from "@/lib/pricing";
import { tierOptionLabel } from "@/lib/tier-pricing";

/**
 * Ready-mix calculator: m³ at the chosen tier, never below a full
 * mixer-truck load, with pump hire priced separately (and quoted until a
 * written supplier rate exists). Mirrors services/pricing/calculators/ready_mix.py;
 * every order is re-priced by the pricing service.
 */
export function ReadyMixCalculator({ product }: { product: ReadyMixProduct }) {
  const [quantity, setQuantity] = useState(product.minimumLoadM3);
  const [tierName, setTierName] = useState<CustomerTierName>("RETAIL");
  const [pumpCode, setPumpCode] = useState("");
  const prices = product.units[0].prices;
  const unitPrice = prices?.[tierName] ?? null;
  const belowMinimum = quantity < product.minimumLoadM3;
  const total = unitPrice !== null && !belowMinimum ? Math.round(quantity * Math.round(unitPrice * 100)) / 100 : null;
  const pump = PUMP_OPTIONS.find((p) => p.code === pumpCode);
  const pumpTotal = pump && isPumpPriced(pump) ? Math.round(((pump.callOutFee ?? 0) + (pump.ratePerM3 ?? 0) * quantity) * 100) / 100 : null;
  const quoteHref = `/quote?sku=${product.sku}&unit=m3&qty=${quantity}${pump ? `&notes=${encodeURIComponent(`Pump: ${pump.name}`)}` : ""}`;

  return (
    <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">
        Ready-mix · {product.strengthGradeMPa} MPa · {product.mixType}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Quantity (m³)</span>
          <input
            type="number"
            min={product.minimumLoadM3}
            step={0.5}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
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
                {tierOptionLabel("READY_MIX", t.name, t.label)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 font-body text-[11px] text-slate">
        Minimum {product.minimumLoadM3}m³ — a full mixer-truck load. Smaller pours can&apos;t be batched on their own.
      </p>

      {prices === null ? (
        <div className="mt-4 rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-3 font-body text-sm text-basalt">
          <p className="font-semibold">{product.pricingStatus.startsWith("Quote-only") ? "Quote only" : "Price on request"}</p>
          <p className="mt-1 text-xs text-slate">{product.sourceNote}</p>
        </div>
      ) : unitPrice === null ? (
        <div className="mt-4 rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-3 font-body text-sm text-basalt">
          <p className="font-semibold">Quoted for your tier</p>
          <p className="mt-1 text-xs text-slate">Volume / Civil Bulk ready-mix is priced per project — request a quote.</p>
        </div>
      ) : belowMinimum ? (
        <p className="mt-4 font-body text-sm font-semibold text-basalt">Enter at least {product.minimumLoadM3}m³ to see a price.</p>
      ) : (
        <>
          <dl className="mt-4 space-y-1 font-body text-sm text-basalt">
            <div className="flex justify-between">
              <dt className="text-slate">Unit price</dt>
              <dd>{formatZAR(unitPrice)} / m³</dd>
            </div>
          </dl>
          <div className="mt-3 rounded-sm bg-basalt px-4 py-3 font-body text-sm text-limestone">
            Concrete: <strong>{formatZAR(total as number)}</strong>
            <span className="block text-xs text-limestone/70">
              Delivered by the batching plant&apos;s mixer truck — we confirm your pour slot with the plant before dispatch.
            </span>
          </div>
        </>
      )}

      <div className="mt-5 border-t border-basalt/10 pt-4">
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Pump hire (priced separately)</span>
          <select value={pumpCode} onChange={(e) => setPumpCode(e.target.value)} className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm">
            <option value="">No pump — tipping directly from the truck</option>
            {PUMP_OPTIONS.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
                {p.capacityM3PerHr ? ` · ${p.capacityM3PerHr} m³/h` : ""}
              </option>
            ))}
          </select>
        </label>
        {pump && (
          <p className="mt-2 font-body text-xs text-slate">
            {pumpTotal !== null
              ? `Pump: ${formatZAR(pumpTotal)} — distance and washout confirmed in the quote.`
              : "Pump hire is quoted for your site (access, pour size and distance). Your concrete price above doesn't change."}{" "}
            {pump.sourceNote}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {total !== null && <AddToCartButton sku={product.sku} unit="m3" quantity={quantity} />}
        <Link
          href={quoteHref}
          className={`rounded-sm px-5 py-2.5 font-body text-sm font-semibold ${total !== null ? "border border-seam-blue text-seam-blue hover:bg-seam-blue/5" : "bg-seam-blue text-limestone hover:bg-basalt"}`}
        >
          {pump && pumpTotal === null ? "Request a pump quote" : "Request a Quote"}
        </Link>
      </div>
      <p className="mt-2 font-body text-[11px] text-slate">
        Estimate only — every order is re-priced by our pricing service. Benchmark: {product.sourceNote}
      </p>
    </div>
  );
}
