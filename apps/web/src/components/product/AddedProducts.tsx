"use client";

import { setAddedQuotable, type Quotable } from "@/data/quotable";

/**
 * Hands the products staff added in Admin → Catalogue import (docs/catalogue-import.md) to the cart, quote form
 * and every other client lookup (findQuotable) — they aren't in the catalogue files. It runs in render, wrapping
 * the page, so the products are known before anything below looks them up.
 */
export function AddedProductsProvider({ products, children }: { products: Quotable[]; children: React.ReactNode }) {
  setAddedQuotable(products);
  return <>{children}</>;
}
