"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { priceCart, type CartPricing } from "@/app/account/actions";
import { findQuotable, isWholeUnit } from "@/data/quotable";
import { cart, useCart, type CartDelivery } from "@/lib/cart";
import { formatZAR } from "@/lib/pricing";

const GEOLOCATION_ERRORS: Record<number, string> = {
  1: "Location access was blocked — enter the distance instead.",
  2: "Your location isn't available right now — enter the distance instead.",
  3: "Finding your location took too long — try again or enter the distance.",
};

export function deliveryInput(delivery: CartDelivery) {
  if (!delivery) return null;
  return delivery.mode === "location" ? { latitude: delivery.latitude, longitude: delivery.longitude } : { distanceKm: delivery.distanceKm };
}

/** The cart page: lines, delivery (your pin or a distance), and a live price from the pricing service. */
export function CartView({ signedIn }: { signedIn: boolean }) {
  const { lines, delivery } = useCart();
  const [pricing, setPricing] = useState<CartPricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [distance, setDistance] = useState(delivery?.mode === "distance" ? String(delivery.distanceKm) : "");
  const [pending, start] = useTransition();

  useEffect(() => {
    if (delivery?.mode === "distance") setDistance(String(delivery.distanceKm));
  }, [delivery]);

  const key = JSON.stringify({ lines, delivery });
  useEffect(() => {
    const input = deliveryInput(delivery);
    if (lines.length === 0 || !input) {
      setPricing(null);
      return;
    }
    start(async () => {
      const result = await priceCart({ lines, delivery: input });
      if (result.ok) {
        setPricing(result.pricing);
        setError(null);
      } else {
        setPricing(null);
        setError(result.error);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-price whenever the cart or delivery changes
  }, [key]);

  const useLocation = () => {
    if (!navigator.geolocation) return setError(GEOLOCATION_ERRORS[2]);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        cart.setDelivery({ mode: "location", latitude: coords.latitude, longitude: coords.longitude });
      },
      (e) => {
        setLocating(false);
        setError(GEOLOCATION_ERRORS[e.code] ?? GEOLOCATION_ERRORS[2]);
      },
      { timeout: 15000, maximumAge: 300000 },
    );
  };

  if (lines.length === 0) {
    return (
      <div className="rounded-sm border border-basalt/10 bg-white p-8 text-center font-body text-sm text-slate">
        Your cart is empty. <Link href="/products" className="font-semibold text-seam-blue hover:underline">Browse products →</Link>
      </div>
    );
  }

  const quoteHref = `/quote?lines=${encodeURIComponent(lines.map((l) => `${l.sku}~${l.unit}~${l.quantity}`).join(","))}${
    pricing?.distance ? `&km=${Math.ceil(pricing.distance.distanceKm)}` : ""
  }`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div>
        <ul className="divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
          {lines.map((line, index) => {
            const product = findQuotable(line.sku)!;
            const unit = product.units.find((u) => u.code === line.unit)!;
            const priced = pricing?.lines[index];
            return (
              <li key={`${line.sku}-${line.unit}`} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
                <div>
                  <Link href={`/products/${product.slug}`} className="font-body text-sm font-semibold text-basalt hover:text-seam-blue">{product.name}</Link>
                  <p className="font-mono text-[10px] text-slate">{product.sku}</p>
                </div>
                <label className="block">
                  <span className="sr-only">Unit</span>
                  <select
                    value={line.unit}
                    onChange={(e) => cart.update(index, { unit: e.target.value })}
                    className="rounded-sm border border-basalt/20 bg-white px-2 py-1.5 font-body text-sm"
                  >
                    {product.units.map((u) => (
                      <option key={u.code} value={u.code}>{u.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="sr-only">Quantity</span>
                  <input
                    type="number"
                    min={isWholeUnit(line.unit) ? 1 : 0.5}
                    step={isWholeUnit(line.unit) ? 1 : 0.5}
                    value={line.quantity}
                    onChange={(e) => {
                      const q = Number(e.target.value);
                      if (q > 0) cart.update(index, { quantity: isWholeUnit(line.unit) ? Math.round(q) : q });
                    }}
                    className="w-24 rounded-sm border border-basalt/20 px-2 py-1.5 font-body text-sm"
                  />
                </label>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <span className="font-body text-sm tabular-nums text-basalt">
                    {priced?.total != null ? formatZAR(priced.total) : priced ? "On request" : unit.retailPrice !== null ? `${formatZAR(unit.retailPrice)} / ${unit.label}` : "On request"}
                  </span>
                  <button type="button" onClick={() => cart.remove(index)} aria-label={`Remove ${product.name}`} className="font-body text-xs text-slate hover:text-red-700">
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => cart.clear()} className="mt-3 font-body text-xs text-slate hover:text-basalt">
          Empty cart
        </button>
      </div>

      <aside className="space-y-4">
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Delivery</h2>
          <p className="mt-1 font-body text-xs text-slate">Priced from the partner supplier nearest your site.</p>
          <button
            type="button"
            onClick={useLocation}
            disabled={locating}
            className="mt-3 w-full rounded-sm border border-seam-blue px-3 py-2 font-body text-sm font-semibold text-seam-blue hover:bg-seam-blue/5 disabled:opacity-50"
          >
            {locating ? "Finding your site…" : delivery?.mode === "location" ? "✓ Using my location — update" : "Use my location"}
          </button>
          <form
            className="mt-3 flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const km = Number(distance);
              if (distance !== "" && km >= 0) cart.setDelivery({ mode: "distance", distanceKm: km });
            }}
          >
            <label className="block flex-1">
              <span className="font-mono text-[10px] uppercase text-slate">Or distance from supplier (km)</span>
              <input type="number" min={0} value={distance} onChange={(e) => setDistance(e.target.value)} className="mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
            </label>
            <button type="submit" className="rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm">Set</button>
          </form>
          {pricing?.distance && (
            <p className="mt-3 font-body text-xs text-slate">
              {pricing.distance.source === "LOCATION"
                ? `${pricing.distance.distanceKm}km in a straight line from our partner supplier in ${pricing.distance.fromTown}. Road distance is confirmed at dispatch.`
                : `${pricing.distance.distanceKm}km, as entered — confirmed at dispatch.`}
            </p>
          )}
        </section>

        <section className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm" aria-live="polite">
          {!delivery ? (
            <p className="text-slate">Share your location or enter a distance to see your delivered price.</p>
          ) : pending && !pricing ? (
            <p className="text-slate">Pricing…</p>
          ) : error ? (
            <p role="alert" className="text-red-800">{error}</p>
          ) : pricing ? (
            <>
              <dl className="space-y-1">
                <div className="flex justify-between"><dt className="text-slate">Materials</dt><dd className="tabular-nums">{formatZAR(pricing.subtotal)}</dd></div>
                <div className="flex justify-between">
                  <dt className="text-slate">Delivery</dt>
                  <dd className="tabular-nums">{pricing.delivery.fee === null ? "Quoted" : pricing.delivery.fee === 0 ? "Included" : formatZAR(pricing.delivery.fee)}</dd>
                </div>
                {pricing.total !== null && (
                  <div className="flex justify-between border-t border-basalt/10 pt-2 font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatZAR(pricing.total)}</dd></div>
                )}
              </dl>
              <p className="mt-2 font-mono text-[10px] text-slate">Priced at {pricing.customer_tier === "RETAIL" ? "retail" : pricing.customer_tier === "CONTRACTOR_TRADE" ? "your trade account" : "your volume account"} rates.</p>
              {pricing.is_quote_only ? (
                <div className="mt-4 rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-3">
                  <p className="font-semibold text-basalt">This order needs a quote</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate">
                    {pricing.reasons.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                  <Link href={quoteHref} className="mt-3 inline-block rounded-sm bg-seam-blue px-4 py-2 text-sm font-semibold text-limestone hover:bg-basalt">
                    Request a quote for this cart
                  </Link>
                </div>
              ) : (
                <Link
                  href={signedIn ? "/checkout" : "/account/login?next=/checkout"}
                  className="mt-4 block rounded-sm bg-seam-blue px-4 py-3 text-center font-semibold text-limestone hover:bg-basalt"
                >
                  {signedIn ? "Checkout" : "Sign in to check out"}
                </Link>
              )}
            </>
          ) : null}
        </section>
        <p className="font-body text-[11px] text-slate">
          Prices are recalculated by our pricing service at checkout. Civil bulk orders and deliveries beyond 100km are
          quoted individually.
        </p>
      </aside>
    </div>
  );
}
