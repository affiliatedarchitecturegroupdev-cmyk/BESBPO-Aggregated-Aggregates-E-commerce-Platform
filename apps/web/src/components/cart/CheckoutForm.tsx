"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { placeOrder, priceCart, type CartPricing } from "@/app/account/actions";
import { deliveryInput } from "@/components/cart/CartView";
import { findQuotable } from "@/data/quotable";
import { cart, useCart } from "@/lib/cart";
import { PROVINCES } from "@/lib/suppliers";
import { formatZAR } from "@/lib/pricing";
import type { SavedAddress } from "@/lib/account-types";

export type { SavedAddress };

const inputClass = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";
const labelClass = "font-mono text-[10px] uppercase text-slate";

function formatAddress(a: SavedAddress) {
  return [a.addressLine1, a.addressLine2, a.city, a.postalCode].filter(Boolean).join(", ");
}

/**
 * Checkout: confirm the priced cart, give the site address and contact,
 * place the order, then choose how to pay on the order page. The API
 * re-prices everything and refuses anything quote-only.
 */
export function CheckoutForm({ addresses, email }: { addresses: SavedAddress[]; email: string }) {
  const router = useRouter();
  const { lines, delivery } = useCart();
  const initial = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [addressId, setAddressId] = useState(initial?.id ?? "");
  const [address, setAddress] = useState(initial ? formatAddress(initial) : "");
  const [province, setProvince] = useState(initial?.province ?? "KwaZulu-Natal");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [whatsappUpdates, setWhatsappUpdates] = useState(false);
  const [pricing, setPricing] = useState<CartPricing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, startPlacing] = useTransition();
  const [, startPricing] = useTransition();
  const input = deliveryInput(delivery);

  const key = JSON.stringify({ lines, delivery });
  useEffect(() => {
    if (lines.length === 0 || !input) return;
    startPricing(async () => {
      const result = await priceCart({ lines, delivery: input });
      if (result.ok) setPricing(result.pricing);
      else setError(result.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-price whenever the cart or delivery changes
  }, [key]);

  if (lines.length === 0 || !input) {
    return (
      <div className="rounded-sm border border-basalt/10 bg-white p-8 text-center font-body text-sm text-slate">
        {lines.length === 0 ? "Your cart is empty." : "Set your delivery location or distance first."}{" "}
        <Link href={lines.length === 0 ? "/products" : "/cart"} className="font-semibold text-seam-blue hover:underline">
          {lines.length === 0 ? "Browse products →" : "Back to cart →"}
        </Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startPlacing(async () => {
      const result = await placeOrder({ lines, delivery: input, deliveryAddress: address, deliveryProvince: province, contactPhone: phone, whatsappUpdates: whatsappUpdates && phone.trim() !== "", notes });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      cart.clear();
      router.push(`/orders/${result.orderId}/confirmation`);
    });
  };

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4 rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Delivery details</h2>
        {addresses.length > 0 && (
          <label className="block">
            <span className={labelClass}>Saved site</span>
            <select
              value={addressId}
              onChange={(e) => {
                setAddressId(e.target.value);
                const chosen = addresses.find((a) => a.id === e.target.value);
                if (chosen) {
                  setAddress(formatAddress(chosen));
                  setProvince(chosen.province);
                }
              }}
              className={inputClass}
            >
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>{a.label} — {a.city}</option>
              ))}
              <option value="">A different address</option>
            </select>
          </label>
        )}
        <p className="font-body text-xs text-slate">
          <Link href="/account/settings#addresses" className="text-seam-blue hover:underline">
            {addresses.length > 0 ? "Manage your saved delivery sites" : "Save your delivery sites"}
          </Link>{" "}
          {addresses.length > 0 ? "in account settings." : "in account settings to pick them here next time."}
        </p>
        <label className="block">
          <span className={labelClass}>Site address *</span>
          <textarea required minLength={3} maxLength={300} rows={2} value={address} onChange={(e) => { setAddress(e.target.value); setAddressId(""); }} className={inputClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Province *</span>
            <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputClass}>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelClass}>Site contact phone</span>
            <input type="tel" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className={inputClass} />
          </label>
        </div>
        <label className="flex items-start gap-2 font-body text-sm text-basalt">
          <input type="checkbox" checked={whatsappUpdates && phone.trim() !== ""} disabled={phone.trim() === ""} onChange={(e) => setWhatsappUpdates(e.target.checked)} className="mt-1" />
          <span>
            Send delivery updates to this number on WhatsApp too
            {phone.trim() === "" && <span className="block text-xs text-slate">Add a phone number to choose this.</span>}
          </span>
        </label>
        <label className="block">
          <span className={labelClass}>Site access and delivery notes</span>
          <textarea rows={3} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, tipping spot, access for a 10m³ tipper…" className={inputClass} />
        </label>
        <p className="font-body text-xs text-slate">Order confirmations and delivery updates are emailed to {email}.</p>
      </div>

      <aside className="space-y-4">
        <section className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
          <h2 className="font-semibold text-basalt">Order summary</h2>
          <ul className="mt-3 divide-y divide-basalt/5">
            {lines.map((line, i) => {
              const product = findQuotable(line.sku)!;
              const unit = product.units.find((u) => u.code === line.unit)!;
              return (
                <li key={`${line.sku}-${line.unit}`} className="flex justify-between gap-3 py-2">
                  <span>{line.quantity} × {unit.label} {product.name}</span>
                  <span className="tabular-nums">{pricing?.lines[i]?.total != null ? formatZAR(pricing.lines[i].total!) : "…"}</span>
                </li>
              );
            })}
          </ul>
          {pricing && (
            <dl className="mt-3 space-y-1 border-t border-basalt/10 pt-3">
              <div className="flex justify-between"><dt className="text-slate">Materials</dt><dd className="tabular-nums">{formatZAR(pricing.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate">Delivery ({pricing.distance.distanceKm}km)</dt><dd className="tabular-nums">{pricing.delivery.fee === null ? "Quoted" : pricing.delivery.fee === 0 ? "Included" : formatZAR(pricing.delivery.fee)}</dd></div>
              {pricing.total !== null && <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatZAR(pricing.total)}</dd></div>}
            </dl>
          )}
          {pricing?.is_quote_only && (
            <p className="mt-3 rounded-sm bg-ochre-gold/10 p-3 text-xs text-basalt">
              This order needs a quote: {pricing.reasons.join(" ")} <Link href="/cart" className="font-semibold text-seam-blue underline">Back to cart</Link>
            </p>
          )}
        </section>
        {error && <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">{error}</p>}
        <button
          type="submit"
          disabled={placing || !pricing || pricing.is_quote_only}
          className="w-full rounded-sm bg-seam-blue px-4 py-3 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50"
        >
          {placing ? "Placing order…" : "Place order and choose payment"}
        </button>
        <p className="font-body text-[11px] text-slate">
          By placing the order you accept our <Link href="/legal/terms-and-conditions" className="underline">Terms</Link> and{" "}
          <Link href="/legal/shipping-delivery" className="underline">Shipping &amp; Delivery policy</Link>. You choose how to pay on
          the next page.
        </p>
      </aside>
    </form>
  );
}
