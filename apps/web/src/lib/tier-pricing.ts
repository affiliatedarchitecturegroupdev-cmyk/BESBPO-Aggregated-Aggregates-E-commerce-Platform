/**
 * Floor-based tier discounts (PRICING_POLICY.md, approved Oct 2026) —
 * mirrors services/pricing/calculators/discount_floor.py exactly. The pricing
 * service re-prices every cart and quote; this module only lets the
 * storefront show the same numbers while the customer is choosing.
 *
 *   cost  = list / (1 + markup);  floor = cost x 1.03
 *   tier price = max(list x (1 - tier discount), floor)
 */
import type { CustomerTierName } from "@/data/catalogue";

export type PricingFamily = "AGGREGATE" | "CEMENT_BAGGED" | "CEMENT_BULK" | "READY_MIX" | "STEEL" | "MASONRY";

export const MIN_MARGIN = 0.03;
export const STOREFRONT_MARKUP = 0.08;

/** Discount per tier (fraction); null = no self-serve price for that tier (it's quoted). */
export const SCHEDULE: Record<PricingFamily, Record<CustomerTierName, number | null>> = {
  AGGREGATE: { RETAIL: 0, CONTRACTOR_TRADE: 0.08, VOLUME_CIVIL_BULK: 0.15 },
  CEMENT_BAGGED: { RETAIL: 0, CONTRACTOR_TRADE: 0.04, VOLUME_CIVIL_BULK: null },
  CEMENT_BULK: { RETAIL: 0, CONTRACTOR_TRADE: null, VOLUME_CIVIL_BULK: null },
  READY_MIX: { RETAIL: 0, CONTRACTOR_TRADE: 0.02, VOLUME_CIVIL_BULK: null },
  STEEL: { RETAIL: 0, CONTRACTOR_TRADE: 0.04, VOLUME_CIVIL_BULK: null },
  // Trade 4% approved by the owner, 10 Oct 2026.
  MASONRY: { RETAIL: 0, CONTRACTOR_TRADE: 0.04, VOLUME_CIVIL_BULK: null },
};

const cents = (value: number) => Math.round(value * 100 + 1e-9) / 100;

export function floorPrice(list: number, markup: number): number {
  return cents((list / (1 + markup)) * (1 + MIN_MARGIN));
}

/** The unit price at a tier, or null when that tier's price is quoted. */
export function tierPrice(list: number, markup: number, family: PricingFamily, tier: CustomerTierName): number | null {
  const discount = SCHEDULE[family][tier];
  if (discount === null) return null;
  const wanted = cents(list * (1 - discount));
  return discount === 0 ? wanted : Math.max(wanted, floorPrice(list, markup));
}

/** Tier dropdown label: what the tier gets for this family. */
export function tierOptionLabel(family: PricingFamily, tier: CustomerTierName, label: string): string {
  const discount = SCHEDULE[family][tier];
  if (discount === null) return `${label} (quoted)`;
  if (discount === 0) return `${label} (list price)`;
  return `${label} (up to ${Math.round(discount * 100)}% off)`;
}

const STEEL_UNITS = ["LENGTH_6M", "LENGTH_12M", "TONNE", "SHEET", "ROLL", "COIL", "PACK", "EACH"];

/**
 * Bagged cement and mortar take the bagged discount; bulk formats are quoted
 * for trade and volume; steel and masonry are their own families. Masonry
 * shares units with steel (item, roll), so pass the product's line.
 */
export function packagedFamily(unit: string, line?: "packaged" | "steel" | "masonry"): PricingFamily {
  if (line === "masonry") return "MASONRY";
  if (line === "steel" || STEEL_UNITS.includes(unit)) return "STEEL";
  return unit === "BAG_25KG" || unit === "BAG_50KG" ? "CEMENT_BAGGED" : "CEMENT_BULK";
}

/** Headline for a tier's card ("Up to 8% off"). */
export function tierHeadline(tier: CustomerTierName): string {
  const best = Math.max(...Object.values(SCHEDULE).map((s) => s[tier] ?? 0));
  return best === 0 ? "List price" : `Up to ${Math.round(best * 100)}% off`;
}

/** What the tier gets, family by family — shown under the headline. */
export function tierBreakdown(tier: CustomerTierName): string {
  if (tier === "RETAIL") return "List prices on everything.";
  const pct = (family: PricingFamily) => SCHEDULE[family][tier];
  const part = (family: PricingFamily, name: string) => {
    const d = pct(family);
    return d === null ? `${name} quoted` : `${Math.round(d * 100)}% off ${name}`;
  };
  return `${part("AGGREGATE", "aggregates")} · ${part("CEMENT_BAGGED", "bagged cement")} · ${part("READY_MIX", "ready-mix")} · ${part("STEEL", "steel")} · ${part("MASONRY", "bricks, paving & drainage")}. Never below our margin floor.`;
}
