"use client";

import Link from "next/link";
import { useState } from "react";
import { cart } from "@/lib/cart";

/** One-tap add to cart from a listing card: one of the cheapest buy-online unit. */
export function QuickAdd({ sku, unit, unitLabel }: { sku: string; unit: string; unitLabel: string }) {
  const [added, setAdded] = useState(false);
  return added ? (
    <span role="status" className="font-body text-xs text-seam-blue">
      Added · <Link href="/cart" className="font-semibold underline">Cart →</Link>
    </span>
  ) : (
    <button
      type="button"
      onClick={() => {
        cart.add({ sku, unit, quantity: 1 });
        setAdded(true);
      }}
      aria-label={`Add 1 ${unitLabel} to cart`}
      className="rounded-sm bg-basalt px-3 py-1.5 font-body text-xs font-semibold text-limestone hover:bg-seam-blue"
    >
      Add to cart
    </button>
  );
}
