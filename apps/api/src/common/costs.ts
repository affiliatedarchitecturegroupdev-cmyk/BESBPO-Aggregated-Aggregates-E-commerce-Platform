import type { AuthUser } from "./auth/auth-user";

/**
 * Cost and margin data are admin-only (ANALYTICS.md): staff and customers see
 * prices and revenue, never what an item or a delivery cost us. Every order
 * response passes through `forViewer`, which strips these keys at any depth
 * unless the caller is an admin.
 */
export const COST_KEYS = ["unitCost", "costSource", "pricingFamily", "deliveryCost", "deliveryCostSource", "deliveryCostNote"] as const;

export function withoutCosts<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => withoutCosts(v)) as T;
  if (value && typeof value === "object" && !(value instanceof Date) && !isDecimal(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if ((COST_KEYS as readonly string[]).includes(k)) continue;
      out[k] = withoutCosts(v);
    }
    return out as T;
  }
  return value;
}

export function forViewer<T>(value: T, user: Pick<AuthUser, "role"> | null | undefined): T {
  return user?.role === "ADMIN" ? value : withoutCosts(value);
}

function isDecimal(value: object): boolean {
  // Prisma.Decimal (decimal.js) — keep it intact so it serialises as before.
  return typeof (value as { toFixed?: unknown }).toFixed === "function" && "d" in value && "e" in value;
}
