import { haversineKm } from "./supplier-csv";

/**
 * "Available near you" (ROADMAP 4.4, docs/availability.md): what we can honestly say about a product near a
 * shopper, from two signals —
 *
 * - **listed**: a partner supplier has a current approved price for this product, or we've learned its code for
 *   it from its price lists (docs/supplier-prices.md) — it sells this product;
 * - **range**: a partner supplier supplies the product's category — it can usually get it.
 *
 * Never "in stock" (we don't hold stock data), never a supplier's name or contact details: only the nearest
 * town, the province and a rounded distance. Pure, so it is unit-tested without a database.
 */

export type SupplierPoint = { id: string; city: string; province: string; latitude: number | null; longitude: number | null };
export type Nearest = { town: string; province: string; distanceKm: number };
export type Availability = {
  /** Partner suppliers that list this product, and that supply its category. */
  listed: number;
  range: number;
  /** Provinces with a listing supplier — shown when the shopper hasn't given a location. */
  listedProvinces: string[];
  nearestListed: Nearest | null;
  nearestRange: Nearest | null;
};

/** Distances are shown to the nearest kilometre (5 km past 50 km) — enough to judge delivery, no more. */
export const roundKm = (km: number) => (km < 50 ? Math.max(1, Math.round(km)) : Math.round(km / 5) * 5);

function nearest(points: SupplierPoint[], at: { latitude: number; longitude: number } | null): Nearest | null {
  if (!at) return null;
  let best: Nearest | null = null;
  let bestKm = Infinity;
  for (const p of points) {
    if (p.latitude === null || p.longitude === null) continue;
    const km = haversineKm(at, { latitude: p.latitude, longitude: p.longitude });
    if (km < bestKm) {
      bestKm = km;
      best = { town: p.city, province: p.province, distanceKm: roundKm(km) };
    }
  }
  return best;
}

export function availability(listed: SupplierPoint[], range: SupplierPoint[], at: { latitude: number; longitude: number } | null): Availability {
  const listedIds = new Set(listed.map((s) => s.id));
  // A supplier that lists the product is not counted again as merely carrying the range.
  const rangeOnly = range.filter((s) => !listedIds.has(s.id));
  return {
    listed: listed.length,
    range: listed.length + rangeOnly.length,
    listedProvinces: [...new Set(listed.map((s) => s.province))].sort(),
    nearestListed: nearest(listed, at),
    nearestRange: nearest([...listed, ...rangeOnly], at),
  };
}
