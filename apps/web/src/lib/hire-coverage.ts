import "server-only";
import { apiCached } from "./api";

export type HireCoverage = { province: string; skus: string[] }[];

export const provinceSlug = (province: string) => province.toLowerCase().replace(/[^a-z]+/g, "-").replace(/(^-|-$)/g, "");

/**
 * Provinces with at least one active partner and active fleet (no partner
 * details). Province pages exist only for these — never for a province we
 * can't serve. Empty when the API can't be reached (e.g. during the build).
 */
export async function getHireCoverage(): Promise<HireCoverage> {
  return (await apiCached<HireCoverage>("/hire-coverage", 300)) ?? [];
}

export async function findCoveredProvince(slug: string) {
  return (await getHireCoverage()).find((c) => provinceSlug(c.province) === slug) ?? null;
}
