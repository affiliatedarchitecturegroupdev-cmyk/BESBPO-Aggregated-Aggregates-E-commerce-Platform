"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CUSTOMER_TIERS, type CustomerTierName, type Product, type Unit } from "@/data/catalogue";
import { useNearestDeliveryPoint } from "@/components/suppliers/useNearestDeliveryPoint";
import { estimateDelivery, estimateLine, formatZAR, UNIT_LABELS } from "@/lib/pricing";

function unitButtonLabel(unit: Unit, product: Product) {
  if (unit === "ton") return "Bulk (ton)";
  if (unit === "m3") return "Bulk (m³)";
  return `Bagged (${product.bagWeightKg}kg)`;
}

/**
 * Module 1 + 2: Bulk / Bag Toggle + Tonnage-Volume Calculator, live-priced
 * against the customer's tier and delivery distance. Converts between tons
 * and m³ using the product's bulk density; unit prices come straight from
 * the pricing framework, so the displayed price is never a second,
 * hand-maintained number.
 */
export function BulkBagCalculator({ product }: { product: Product }) {
  const [unit, setUnit] = useState<Unit>(product.units[0]);
  const [quantity, setQuantity] = useState(unit === "bag" ? 10 : 6);
  const [tierName, setTierName] = useState<CustomerTierName>("RETAIL");
  const [distanceKm, setDistanceKm] = useState(25);
  const { state: nearest, locate } = useNearestDeliveryPoint();
  const [fromLocation, setFromLocation] = useState(false);

  async function useMyLocation() {
    const result = await locate(product.categorySlug);
    if (result.status === "found") {
      setDistanceKm(Math.ceil(result.distanceKm));
      setFromLocation(true);
    }
  }

  const line = useMemo(() => estimateLine(product, quantity, unit, tierName), [product, quantity, unit, tierName]);
  const delivery = useMemo(
    () =>
      quantity > 0
        ? estimateDelivery({
            distanceKm,
            tierName,
            bulkM3: unit === "bag" ? 0 : line.m3,
            bulkTons: unit === "bag" ? 0 : line.tons,
            baggedKg: line.baggedKg,
            totalM3: line.m3,
          })
        : null,
    [distanceKm, tierName, unit, line, quantity],
  );

  const quoteHref = `/quote?sku=${product.sku}&unit=${unit}&qty=${quantity}&km=${distanceKm}`;

  return (
    <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">Tonnage / Bag Calculator</p>

      <div className="mt-3 flex gap-2">
        {product.units.map((u) => (
          <button
            key={u}
            onClick={() => setUnit(u)}
            className={`rounded-sm border px-3 py-1.5 font-body text-xs ${
              unit === u ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt"
            }`}
          >
            {unitButtonLabel(u, product)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Quantity ({UNIT_LABELS[unit]})</span>
          <input
            type="number"
            min={0}
            step={unit === "bag" ? 1 : "any"}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
            className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Delivery distance (km)</span>
          <input
            type="number"
            min={0}
            value={distanceKm}
            onChange={(e) => {
              setDistanceKm(Math.max(0, Number(e.target.value)));
              setFromLocation(false);
            }}
            className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
          />
          <button
            type="button"
            onClick={useMyLocation}
            disabled={nearest.status === "locating"}
            className="mt-1 font-body text-xs font-semibold text-seam-blue hover:underline disabled:opacity-50"
          >
            {nearest.status === "locating" ? "Finding…" : "Use my location"}
          </button>
        </label>
        <label className="col-span-2 block">
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

      <div aria-live="polite" className="font-body text-[11px] text-slate">
        {fromLocation && nearest.status === "found" && (
          <p className="mt-2">
            Nearest supplier of this material: {nearest.town}, {nearest.province} — {nearest.distanceKm}km in a straight
            line. Road distance is usually further; we confirm it at checkout.
          </p>
        )}
        {nearest.status === "none" && <p className="mt-2">No mapped supplier stocks this material yet — enter the distance or request a quote.</p>}
        {nearest.status === "error" && <p className="mt-2">{nearest.message}</p>}
      </div>

      <dl className="mt-4 space-y-1 font-body text-sm text-basalt">
        <div className="flex justify-between">
          <dt className="text-slate">Equivalent</dt>
          <dd>
            {line.tons.toFixed(2)} tons &nbsp;⇄&nbsp; {line.m3.toFixed(2)} m³
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Unit price</dt>
          <dd>
            {formatZAR(line.unitPrice)} / {UNIT_LABELS[unit]}
          </dd>
        </div>
        {!line.isQuoteOnly && delivery && !delivery.isQuoteOnly && (
          <>
            <div className="flex justify-between">
              <dt className="text-slate">Material</dt>
              <dd>{formatZAR(line.total)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">Delivery</dt>
              <dd>{delivery.fee === 0 ? "Included" : formatZAR(delivery.fee)}</dd>
            </div>
          </>
        )}
      </dl>

      {delivery?.isQuoteOnly ? (
        <div className="mt-4 rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-3 font-body text-sm text-basalt">
          {delivery.reasons.join(" ")}{" "}
          <Link href={quoteHref} className="font-semibold text-seam-blue hover:underline">
            Request a quote →
          </Link>
        </div>
      ) : delivery ? (
        <div className="mt-4 rounded-sm bg-basalt px-4 py-3 font-body text-sm text-limestone">
          Estimated total: <strong>{formatZAR(line.total + delivery.fee)}</strong>
        </div>
      ) : null}
      {/* No cart yet: every order starts as a quote request carrying this load. */}
      <Link
        href={quoteHref}
        className="mt-4 inline-block rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt"
      >
        Add to Quote Request
      </Link>
      <p className="mt-2 font-body text-[11px] text-slate">
        Estimate only — your order is re-priced at checkout. Delivery distance is measured from the nearest approved
        partner supplier.
      </p>
    </div>
  );
}
