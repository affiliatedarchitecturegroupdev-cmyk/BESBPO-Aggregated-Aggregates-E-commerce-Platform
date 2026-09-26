"use client";

import { useMemo, useState } from "react";
import { estimateDeliveryFee, formatZAR } from "@/lib/pricing";

export function DeliveryEstimator() {
  const [distanceKm, setDistanceKm] = useState(25);
  const [quantityM3, setQuantityM3] = useState(4);

  const quote = useMemo(() => estimateDeliveryFee(distanceKm, quantityM3), [distanceKm, quantityM3]);

  return (
    <div className="rounded-sm border border-basalt/10 bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-slate">Delivery Estimate</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Distance (km)</span>
          <input
            type="number"
            min={0}
            value={distanceKm}
            onChange={(e) => setDistanceKm(Number(e.target.value))}
            className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Load size (m³)</span>
          <input
            type="number"
            min={0}
            value={quantityM3}
            onChange={(e) => setQuantityM3(Number(e.target.value))}
            className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm"
          />
        </label>
      </div>
      <p className="mt-4 font-body text-sm">
        {quote.isQuoteOnly ? (
          <span className="text-ochre-gold">{quote.reason}</span>
        ) : (
          <>
            Estimated delivery fee: <strong>{formatZAR(quote.fee ?? 0)}</strong>
          </>
        )}
      </p>
    </div>
  );
}
