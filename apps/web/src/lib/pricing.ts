/**
 * Client-side helpers mirroring the FastAPI pricing microservice's
 * calculators (services/pricing/calculators/). Kept in sync deliberately —
 * see AGENTIC_RULES.md rule 1 for the reconciliation rule these both serve.
 */
export type CustomerTierName = "RETAIL" | "CONTRACTOR_TRADE" | "VOLUME_CIVIL_BULK";

export const TIER_DISCOUNTS: Record<CustomerTierName, number> = {
  RETAIL: 0,
  CONTRACTOR_TRADE: 8,
  VOLUME_CIVIL_BULK: 15,
};

export const VOLUME_CIVIL_BULK_THRESHOLD_M3 = 10;

export function tonsToM3(tons: number, bulkDensityKgPerM3: number): number {
  return (tons * 1000) / bulkDensityKgPerM3;
}

export function m3ToTons(m3: number, bulkDensityKgPerM3: number): number {
  return (m3 * bulkDensityKgPerM3) / 1000;
}

export function pricePerM3(listPricePerTon: number, bulkDensityKgPerM3: number): number {
  return Math.round(listPricePerTon * (bulkDensityKgPerM3 / 1000) * 100) / 100;
}

export function applyTierDiscount(price: number, tier: CustomerTierName): number {
  const discount = TIER_DISCOUNTS[tier];
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}

export function formatZAR(value: number): string {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(value);
}

export type LoadSize = "M3_6" | "M3_10" | "M3_14_PLUS";

export function loadSizeForQuantityM3(quantityM3: number): LoadSize {
  if (quantityM3 <= 6) return "M3_6";
  if (quantityM3 <= 10) return "M3_10";
  return "M3_14_PLUS";
}

const DELIVERY_FEES: Record<Exclude<LoadSize, never>, { band30to60: number; band60to100: number }> = {
  M3_6: { band30to60: 450, band60to100: 750 },
  M3_10: { band30to60: 650, band60to100: 1050 },
  M3_14_PLUS: { band30to60: 850, band60to100: 1400 },
};

export type DeliveryQuote = {
  isQuoteOnly: boolean;
  reason?: string;
  fee?: number;
};

export function estimateDeliveryFee(distanceKm: number, quantityM3: number): DeliveryQuote {
  if (quantityM3 >= VOLUME_CIVIL_BULK_THRESHOLD_M3) {
    return { isQuoteOnly: true, reason: "Volume/Civil Bulk tier order (≥10m³) — request a quote." };
  }
  if (distanceKm > 100) {
    return { isQuoteOnly: true, reason: "Delivery beyond 100km is quoted individually." };
  }
  if (distanceKm <= 30) {
    return { isQuoteOnly: false, fee: 0 };
  }
  const loadSize = loadSizeForQuantityM3(quantityM3);
  if (distanceKm <= 60) {
    return { isQuoteOnly: false, fee: DELIVERY_FEES[loadSize].band30to60 };
  }
  return { isQuoteOnly: false, fee: DELIVERY_FEES[loadSize].band60to100 };
}
