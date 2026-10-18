"use client";

import { findQuotable } from "@/data/quotable";
import { useCart } from "@/lib/cart";
import { leadTimeLabel, type LeadTime } from "@/lib/phase4";

/**
 * Cart and checkout: the usual lead time for what's in the cart — the
 * longest of its categories, since the order arrives together — but only
 * when staff have set a lead time for every category in it.
 */
export function CartLeadTimes({ leadTimes }: { leadTimes: LeadTime[] }) {
  const { lines } = useCart();
  const bySlug = new Map(leadTimes.map((t) => [t.categorySlug, t]));
  const slugs = [...new Set(lines.flatMap((l) => findQuotable(l.sku)?.categorySlug ?? []))];
  if (slugs.length === 0 || !slugs.every((s) => bySlug.has(s))) return null;
  const longest = slugs.map((s) => bySlug.get(s)!).reduce((a, b) => (b.maxDays > a.maxDays || (b.maxDays === a.maxDays && b.minDays > a.minDays) ? b : a));
  return (
    <p className="mt-4 rounded-sm border border-basalt/10 bg-white px-3 py-2 font-body text-xs text-basalt">
      <span className="font-mono text-[10px] uppercase text-slate">Usual lead time</span> · {leadTimeLabel(longest)} from order confirmation. Need it in
      stages? After ordering, plan phased deliveries from your order&apos;s tracking page.
    </p>
  );
}
