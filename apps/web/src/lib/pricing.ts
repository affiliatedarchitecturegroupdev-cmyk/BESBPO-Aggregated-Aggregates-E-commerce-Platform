/**
 * Storefront price previews. Unit prices are never computed here — they are
 * read from the catalogue, which the pricing service generated. This file
 * only multiplies them out and mirrors the pricing service's delivery rules
 * (services/pricing/calculators/delivery_bands.py) so the calculator can
 * update as the customer types. Checkout is always re-priced server-side;
 * these numbers are an estimate, never the charge.
 */
import {
  CUSTOMER_TIERS,
  DELIVERY_RULES,
  type CustomerTierName,
  type LoadSize,
  type Product,
  type Unit,
} from "@/data/catalogue";

// Pinned to the spec's "R1,234.56" style rather than the en-ZA locale: Node
// and browsers ship different en-ZA data ("R 1 234,56" vs "R 1 234.56"),
// which made server- and client-rendered prices disagree.
const ZAR = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatZAR(value: number): string {
  return `${value < 0 ? "-" : ""}R${ZAR.format(Math.abs(value))}`;
}

export const UNIT_LABELS: Record<Unit, string> = { ton: "ton", m3: "m³", bag: "bag" };

export function tonsToM3(tons: number, bulkDensityKgPerM3: number): number {
  return (tons * 1000) / bulkDensityKgPerM3;
}

export function m3ToTons(m3: number, bulkDensityKgPerM3: number): number {
  return (m3 * bulkDensityKgPerM3) / 1000;
}

export function tier(name: CustomerTierName) {
  return CUSTOMER_TIERS.find((t) => t.name === name)!;
}

export type LineEstimate = {
  unitPrice: number;
  total: number;
  tons: number;
  m3: number;
  baggedKg: number;
  isQuoteOnly: boolean;
};

/** Quantity x the tier's unit price, rounded to the cent (half-up, as the pricing service does). */
export function estimateLine(product: Product, quantity: number, unit: Unit, tierName: CustomerTierName): LineEstimate {
  const unitPrice = product.prices[tierName][unit] ?? 0;
  const total = Math.round(quantity * Math.round(unitPrice * 100)) / 100;
  const density = product.bulkDensityKgPerM3;

  let tons: number;
  let m3: number;
  let baggedKg = 0;
  if (unit === "ton") {
    tons = quantity;
    m3 = tonsToM3(tons, density);
  } else if (unit === "m3") {
    m3 = quantity;
    tons = m3ToTons(m3, density);
  } else {
    baggedKg = quantity * (product.bagWeightKg ?? 0);
    tons = baggedKg / 1000;
    m3 = tonsToM3(tons, density);
  }

  const threshold = tier(tierName).quoteOnlyMinM3;
  return { unitPrice, total, tons, m3, baggedKg, isQuoteOnly: threshold !== null && m3 >= threshold };
}

export function loadSizeForQuantityM3(quantityM3: number): LoadSize {
  if (quantityM3 <= 6) return "M3_6";
  if (quantityM3 <= 10) return "M3_10";
  return "M3_14_PLUS";
}

export type DeliveryEstimate = { isQuoteOnly: true; reasons: string[] } | { isQuoteOnly: false; fee: number };

export function estimateDelivery(params: {
  distanceKm: number;
  tierName: CustomerTierName;
  bulkM3?: number;
  bulkTons?: number;
  baggedKg?: number;
  totalM3?: number;
}): DeliveryEstimate {
  const { distanceKm, tierName, bulkM3 = 0, bulkTons = 0, baggedKg = 0 } = params;
  const totalM3 = params.totalM3 ?? bulkM3;
  const rules = DELIVERY_RULES;
  const reasons: string[] = [];
  let fee = 0;

  const threshold = tier(tierName).quoteOnlyMinM3;
  if (threshold !== null && totalM3 >= threshold) {
    reasons.push(`Volume/Civil Bulk orders of ${threshold}m³ or more are quoted individually.`);
  }
  if (distanceKm > rules.quoteOverKm) {
    reasons.push(`Delivery beyond ${rules.quoteOverKm}km is quoted individually.`);
  }

  if (bulkM3 > 0) {
    const meetsMinimum = bulkM3 >= rules.minBulkM3 || bulkTons >= rules.minBulkTons;
    if (meetsMinimum) {
      if (distanceKm <= rules.quoteOverKm) {
        const band = rules.bands.find((b) => b.minKm <= distanceKm && distanceKm <= b.maxKm);
        fee += band?.fees[loadSizeForQuantityM3(bulkM3)] ?? 0;
      }
    } else if (distanceKm <= rules.smallLoadMaxKm) {
      fee += rules.smallLoadFee;
    } else {
      reasons.push(
        `Orders below ${rules.minBulkM3}m³ / ${rules.minBulkTons} tons are only delivered within ${rules.smallLoadMaxKm}km — request a quote.`,
      );
    }
  }

  if (baggedKg > 0) {
    if (distanceKm <= rules.baggedMaxKm) {
      fee += baggedKg >= rules.baggedFreeFromKg ? 0 : rules.baggedFee;
    } else {
      reasons.push(`Bagged delivery is priced within ${rules.baggedMaxKm}km only — request a quote.`);
    }
  }

  return reasons.length > 0 ? { isQuoteOnly: true, reasons } : { isQuoteOnly: false, fee };
}
