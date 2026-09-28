import "server-only";
import { cache } from "react";
import { apiCached } from "./api";
import type { Coverage } from "./suppliers";

export type NetworkSupplier = {
  externalId: string | null;
  name: string;
  province: string;
  city: string;
  address: string | null;
  categorySlugs: string[];
  isActive?: boolean;
  tier?: "TIER_1" | "TIER_2";
};
export type PartnerNetwork = { partners: NetworkSupplier[]; leads: NetworkSupplier[] };

/** Live delivery coverage (active, verified partners). Null when the API can't be reached. */
export const getCoverage = cache(() => apiCached<Coverage>("/suppliers/coverage"));

/** The public partner network: verified partners and researched leads, no contacts. */
export const getNetwork = cache(() => apiCached<PartnerNetwork>("/suppliers/network"));
