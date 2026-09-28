"use client";

import Link from "next/link";
import { useState } from "react";
import { cart } from "@/lib/cart";

/** Adds a line to the cart and offers a way to it. */
export function AddToCartButton({ sku, unit, quantity, disabled = false }: { sku: string; unit: string; quantity: number; disabled?: boolean }) {
  const [added, setAdded] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={disabled || quantity <= 0}
        onClick={() => {
          cart.add({ sku, unit, quantity });
          setAdded(true);
        }}
        className="rounded-sm bg-basalt px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-seam-blue disabled:opacity-50"
      >
        Add to Cart
      </button>
      {added && (
        <span role="status" className="font-body text-xs text-seam-blue">
          Added. <Link href="/cart" className="font-semibold underline">View cart →</Link>
        </span>
      )}
    </span>
  );
}
