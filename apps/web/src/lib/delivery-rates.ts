import { DELIVERY_RULES, type DeliveryRules } from "@/data/catalogue";

/**
 * Admin → Delivery rates (docs/delivery-rates.md), as the API's `/pricing/delivery-rates` gives them: the standard
 * tipper rates and the flatbed fees per product line. The workbook's rates (DELIVERY_RULES) until staff save their own.
 */
export const FLATBED_LINES = ["steel", "masonry", "roofing", "supplies"] as const;
export type FlatbedLine = (typeof FLATBED_LINES)[number];
export const FLATBED_BANDS = ["0–30 km", "30–60 km", "60–100 km"] as const;
export const FLATBED_LINE_LABEL: Record<FlatbedLine, string> = {
  steel: "Steel & reinforcing",
  masonry: "Bricks, blocks, paving & precast",
  roofing: "Roofing & timber",
  supplies: "Building supplies",
};

type LoadSize = "M3_6" | "M3_10" | "M3_14_PLUS";
export type FlatbedRate = { fees: [number, number, number]; freeFrom: number | null };
export type StaffDeliveryRates = {
  bandFees: Record<"BAND_30_60" | "BAND_60_100", Record<LoadSize, number>>;
  smallLoadFee: number;
  baggedFee: number;
  baggedFreeFromKg: number;
  minBulkM3: number;
  minBulkTons: number;
  flatbed: Partial<Record<FlatbedLine, FlatbedRate>>;
};

/** The storefront's delivery rules with the staff rates in place of the workbook's. Distances never change. */
export function deliveryRulesFrom(rates: StaffDeliveryRates | null | undefined): DeliveryRules {
  if (!rates?.bandFees) return DELIVERY_RULES;
  return {
    ...DELIVERY_RULES,
    bands: DELIVERY_RULES.bands.map((b) => (b.label in rates.bandFees && Object.keys(b.fees).length ? { ...b, fees: rates.bandFees[b.label as keyof StaffDeliveryRates["bandFees"]] } : b)),
    smallLoadFee: rates.smallLoadFee,
    baggedFee: rates.baggedFee,
    baggedFreeFromKg: rates.baggedFreeFromKg,
    minBulkM3: rates.minBulkM3,
    minBulkTons: rates.minBulkTons,
  };
}
