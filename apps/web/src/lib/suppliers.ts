/** Supplier network types shared by the admin and the public locator. */

export const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

export type SupplierTier = "TIER_1" | "TIER_2";
export const SUPPLIER_TIER_LABEL: Record<SupplierTier, string> = { TIER_1: "Tier 1", TIER_2: "Tier 2" };

/** The staff-only record. */
export type Supplier = {
  id: string;
  externalId: string | null;
  name: string;
  tier: SupplierTier;
  province: string;
  city: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  categorySlugs: string[];
  productNotes: string | null;
  contactName: string | null;
  contactPhone: string | null;
  isActive: boolean;
  updatedAt: string;
};

export type ImportSummary = {
  created: number;
  updated: number;
  unchanged: number;
  errors: { line: number; message: string }[];
  missingCoordinates: number;
};

/** Public coverage: delivery points per province, never supplier names. */
export type Coverage = {
  deliveryPoints: number;
  withCoordinates: number;
  provinces: { province: string; deliveryPoints: number; towns: string[]; categories: string[] }[];
};

export type NearestDeliveryPoint = { found: true; town: string; province: string; distanceKm: number } | { found: false };
