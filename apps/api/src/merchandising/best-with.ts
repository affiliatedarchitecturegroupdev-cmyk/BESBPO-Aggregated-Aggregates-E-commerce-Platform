/**
 * Best With (docs/best-with.md): which products are bought together, from
 * the products in each paid order. Pure, so it's unit-tested without a
 * database. A pairing only counts once it has been seen in MIN_ORDERS
 * different orders — one big order mustn't decide what everyone is shown.
 */
export const MIN_ORDERS = 3;
/** Pairings kept per product (the storefront shows fewer). */
export const KEEP_PER_PRODUCT = 12;

export type Affinity = { productId: string; pairedProductId: string; orders: number; confidence: number; lift: number };

/**
 * For each product A and each product B bought with it:
 * - orders: paid orders containing both;
 * - confidence: orders(A and B) / orders(A) — how often A's buyers also took B;
 * - lift: confidence / share of all orders with B — above 1 means more than chance.
 */
export function scoreAffinities(orders: string[][], minOrders = MIN_ORDERS, keep = KEEP_PER_PRODUCT): Affinity[] {
  const baskets = orders.map((products) => [...new Set(products)]).filter((b) => b.length > 0);
  const total = baskets.length;
  const single = new Map<string, number>();
  const pairs = new Map<string, number>();
  for (const basket of baskets) {
    for (const a of basket) {
      single.set(a, (single.get(a) ?? 0) + 1);
      for (const b of basket) if (a !== b) pairs.set(`${a}\u0000${b}`, (pairs.get(`${a}\u0000${b}`) ?? 0) + 1);
    }
  }
  const byProduct = new Map<string, Affinity[]>();
  for (const [key, both] of pairs) {
    if (both < minOrders) continue;
    const [a, b] = key.split("\u0000");
    const confidence = both / single.get(a)!;
    const lift = confidence / (single.get(b)! / total);
    const list = byProduct.get(a) ?? [];
    list.push({ productId: a, pairedProductId: b, orders: both, confidence: round(confidence, 4), lift: round(lift, 4) });
    byProduct.set(a, list);
  }
  return [...byProduct.values()].flatMap((list) => list.sort(byStrength).slice(0, keep));
}

/** Strongest first: confidence, then lift, then the number of orders. */
export function byStrength(a: Pick<Affinity, "confidence" | "lift" | "orders">, b: Pick<Affinity, "confidence" | "lift" | "orders">) {
  return b.confidence - a.confidence || b.lift - a.lift || b.orders - a.orders;
}

function round(n: number, places: number) {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}
