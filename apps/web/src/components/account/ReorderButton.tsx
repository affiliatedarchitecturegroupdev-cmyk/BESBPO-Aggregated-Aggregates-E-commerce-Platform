"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { findQuotable } from "@/data/quotable";
import { cartUnit, type UNIT_LABEL } from "@/lib/account-types";
import { cart } from "@/lib/cart";

type Line = { sku?: string; unitOfSale?: keyof typeof UNIT_LABEL; quantity?: number; name: string };

/**
 * Puts a past order's lines back in the cart at today's prices (the cart
 * re-prices everything). Products no longer sold in that unit are skipped
 * and named, rather than silently dropped.
 */
export function ReorderButton({ lines, variant = "subtle" }: { lines: Line[]; variant?: "primary" | "subtle" }) {
  const router = useRouter();
  const [skipped, setSkipped] = useState<string[] | null>(null);

  const reorder = () => {
    const missing: string[] = [];
    let added = 0;
    for (const line of lines) {
      const unit = line.unitOfSale ? cartUnit(line.unitOfSale) : null;
      const product = line.sku ? findQuotable(line.sku) : undefined;
      if (!unit || !line.quantity || !product?.units.some((u) => u.code === unit)) {
        missing.push(line.name);
        continue;
      }
      cart.add({ sku: product.sku, unit, quantity: line.quantity });
      added++;
    }
    if (missing.length === 0) {
      router.push("/cart");
      return;
    }
    setSkipped(missing);
    if (added > 0) setTimeout(() => router.push("/cart"), 2500);
  };

  const style =
    variant === "primary"
      ? "bg-seam-blue text-limestone hover:bg-basalt"
      : "border border-basalt/20 text-basalt hover:border-seam-blue";
  return (
    <span className="inline-flex flex-col">
      <button type="button" onClick={reorder} className={`rounded-sm px-3 py-1.5 font-body text-xs font-semibold ${style}`}>
        Order again
      </button>
      {skipped && (
        <span role="status" className="mt-1 max-w-xs font-body text-[11px] text-slate">
          Not available to reorder online: {skipped.join(", ")}. {skipped.length < lines.length ? "The rest is in your cart." : "Request a quote instead."}
        </span>
      )}
    </span>
  );
}
