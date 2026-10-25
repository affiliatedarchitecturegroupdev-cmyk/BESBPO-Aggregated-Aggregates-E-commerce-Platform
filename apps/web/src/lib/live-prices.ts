/**
 * Approved supplier prices on the storefront (ROADMAP Phase 1, docs/supplier-prices.md). Staff approve a sell
 * price from a supplier's cost in Admin → Supplier prices; the API serves the live ones as the price at each
 * tier (GET /prices/live — never costs or suppliers), and these helpers put them in place of the catalogue's
 * own unit prices. Checkout re-prices everything through the pricing service with the same approved prices.
 *
 * Pure (no server imports), so it can be tested on its own.
 */

export type LiveTierPrices = { RETAIL: number; CONTRACTOR_TRADE: number | null; VOLUME_CIVIL_BULK: number | null };
export type LivePrice = { sku: string; unit: string; prices: LiveTierPrices };
export type LivePriceMap = Map<string, Map<string, LiveTierPrices>>;

/** The pricing status a unit shows while an approved supplier price prices it. */
export const LIVE_PRICE_STATUS = "Ready — supplier price";

export function livePriceMap(list: LivePrice[]): LivePriceMap {
  const map: LivePriceMap = new Map();
  for (const p of list) {
    if (!p || typeof p.sku !== "string" || typeof p.unit !== "string" || !(p.prices?.RETAIL > 0)) continue;
    const units = map.get(p.sku) ?? new Map<string, LiveTierPrices>();
    units.set(p.unit, p.prices);
    map.set(p.sku, units);
  }
  return map;
}

/** A short fingerprint of the live prices, so indexes built from them are rebuilt only when they change. */
export function liveKey(list: LivePrice[]): string {
  if (!list.length) return "";
  return list
    .map((p) => `${p.sku}|${p.unit}|${p.prices.RETAIL}|${p.prices.CONTRACTOR_TRADE ?? ""}`)
    .sort()
    .join(",");
}

type PricedUnitShape = { unit: string; pricingStatus: string; prices: LiveTierPrices | null };

/** The product with its live supplier prices in place of the catalogue's (unchanged when it has none). */
export function applyLivePrices<T extends { sku: string; units: PricedUnitShape[] }>(product: T, live: LivePriceMap): T {
  const units = live.get(product.sku);
  if (!units) return product;
  return {
    ...product,
    units: product.units.map((u) => {
      const prices = units.get(u.unit);
      return prices ? { ...u, prices: { ...prices }, pricingStatus: LIVE_PRICE_STATUS } : u;
    }),
  };
}
