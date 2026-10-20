"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { bestWithForCart } from "@/app/cart/actions";
import { cartBestWith, type BestWithSuggestion } from "@/data/complete-the-job";
import { ProductThumb } from "@/components/product/ProductThumb";
import { cart, useCart } from "@/lib/cart";
import { formatZAR } from "@/lib/pricing";

/**
 * Best With for the cart (docs/best-with.md): what customers buy with these
 * products, then what the same jobs need — never what's already in the cart.
 */
export function CartBestWith({ hiddenSkus }: { hiddenSkus: string[] }) {
  const { lines } = useCart();
  const skus = [...new Set(lines.map((l) => l.sku))];
  const key = skus.join(",");
  const [suggestions, setSuggestions] = useState<BestWithSuggestion[]>([]);

  useEffect(() => {
    if (!skus.length) return setSuggestions([]);
    let live = true;
    bestWithForCart(skus)
      .then((s) => live && setSuggestions(s))
      .catch(() => live && setSuggestions([]));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when the cart's products change
  }, [key]);

  const items = cartBestWith(skus, hiddenSkus, suggestions);
  if (!skus.length || !items.length) return null;
  return (
    <section aria-labelledby="cart-best-with" className="mt-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Best with your cart</p>
      <h2 id="cart-best-with" className="mt-1 font-display text-xl font-bold text-basalt">
        Complete your build
      </h2>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((c) => (
          <li key={c.sku} className="flex overflow-hidden rounded-sm border border-basalt/10 bg-white">
            <ProductThumb sku={c.sku} categorySlug={c.categorySlug} className="w-14 shrink-0 rounded-none" grains={24} />
            <div className="flex min-w-0 flex-1 flex-col p-3">
              <p className="font-body text-xs text-slate">{c.why}</p>
              <Link href={`/products/${c.slug}`} className="mt-0.5 font-body text-sm font-semibold text-basalt hover:text-seam-blue">
                {c.name}
              </Link>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <p className="font-body text-xs text-slate">
                  {c.price !== null ? (
                    <>
                      <strong className="text-basalt">{formatZAR(c.price)}</strong> / {c.unitLabel}
                    </>
                  ) : (
                    <>Price on quote</>
                  )}
                </p>
                {c.price !== null ? (
                  <button
                    type="button"
                    onClick={() => cart.add({ sku: c.sku, unit: c.unit, quantity: c.quantity })}
                    className="rounded-sm bg-basalt px-3 py-1 font-body text-xs font-semibold text-limestone hover:bg-seam-blue"
                    aria-label={`Add ${c.name} to your cart`}
                  >
                    Add
                  </button>
                ) : (
                  <Link href={`/products/${c.slug}`} className="font-body text-xs font-semibold text-seam-blue hover:underline">
                    Quote
                  </Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
