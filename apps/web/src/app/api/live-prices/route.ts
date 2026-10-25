import { getLivePrices } from "@/lib/cms";

/**
 * Live supplier prices (docs/supplier-prices.md) for a few SKUs — the retail price per unit, for client rows
 * built from the static catalogue (Recently viewed) so they don't show "Price on quote" for a priced product.
 * Sell prices only, never costs or suppliers.
 */
export async function GET(request: Request) {
  const skus = new Set(
    (new URL(request.url).searchParams.get("skus") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[A-Z0-9-]{3,60}$/.test(s))
      .slice(0, 50),
  );
  const prices: Record<string, Record<string, number>> = {};
  if (skus.size) {
    for (const p of await getLivePrices()) {
      if (skus.has(p.sku)) prices[p.sku] = { ...prices[p.sku], [p.unit]: p.prices.RETAIL };
    }
  }
  return Response.json({ prices }, { headers: { "Cache-Control": "public, max-age=60" } });
}
