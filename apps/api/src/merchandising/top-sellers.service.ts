import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

const DAY_MS = 24 * 3_600_000;
/** A province shows its own "trending" row only once it has this many paid orders in the window. */
export const MIN_PROVINCE_ORDERS = 3;
const CACHE_MS = 10 * 60_000;

export type TopSellers = { skus: string[]; days: number; province: string | null };

/**
 * Best sellers and trending-by-province for the homepage and department pages (ROADMAP 3.1, docs/merchandising.md):
 * products ranked by how many paid, non-test, not-cancelled orders contained them in the window, then by quantity.
 * Only the ranked SKUs and province names leave the API — never order counts or sales volumes.
 */
@Injectable()
export class TopSellersService {
  private cache = new Map<string, { at: number; value: unknown }>();

  constructor(private readonly prisma: PrismaService) {}

  async topSellers(days = 30, province?: string, limit = 24): Promise<TopSellers> {
    const window = Math.min(Math.max(Math.round(days) || 30, 7), 365);
    const wanted = Math.min(Math.max(Math.round(limit) || 24, 1), 100);
    return this.cached(`top:${window}:${province ?? ""}:${wanted}`, async () => {
      const orders = await this.prisma.order.findMany({
        where: { paidAt: { gte: new Date(Date.now() - window * DAY_MS) }, isTest: false, status: { not: "CANCELLED" }, ...(province ? { deliveryProvince: province } : {}) },
        select: { lineItems: { select: { quantity: true, product: { select: { sku: true, isActive: true } } } } },
      });
      return { skus: rank(orders.map((o) => o.lineItems.filter((l) => l.product.isActive).map((l) => ({ sku: l.product.sku, quantity: l.quantity })))).slice(0, wanted), days: window, province: province ?? null };
    });
  }

  /** Provinces with enough paid orders in the window for a "trending in" row, busiest first. */
  async trendingProvinces(days = 30): Promise<string[]> {
    const window = Math.min(Math.max(Math.round(days) || 30, 7), 365);
    return this.cached(`provinces:${window}`, async () => {
      const groups = await this.prisma.order.groupBy({
        by: ["deliveryProvince"],
        where: { paidAt: { gte: new Date(Date.now() - window * DAY_MS) }, isTest: false, status: { not: "CANCELLED" }, deliveryProvince: { not: null } },
        _count: { _all: true },
      });
      return groups
        .filter((g) => g.deliveryProvince && g._count._all >= MIN_PROVINCE_ORDERS)
        .sort((a, b) => b._count._all - a._count._all)
        .map((g) => g.deliveryProvince as string);
    });
  }

  private async cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
    const value = await load();
    this.cache.set(key, { at: Date.now(), value });
    return value;
  }
}

/** SKUs by the number of orders they were in, then total quantity, then SKU (stable). */
export function rank(orders: { sku: string; quantity: number }[][]): string[] {
  const score = new Map<string, { orders: number; quantity: number }>();
  for (const lines of orders) {
    for (const sku of new Set(lines.map((l) => l.sku))) {
      const s = score.get(sku) ?? { orders: 0, quantity: 0 };
      s.orders += 1;
      s.quantity += lines.filter((l) => l.sku === sku).reduce((t, l) => t + l.quantity, 0);
      score.set(sku, s);
    }
  }
  return [...score].sort(([a, x], [b, y]) => y.orders - x.orders || y.quantity - x.quantity || a.localeCompare(b)).map(([sku]) => sku);
}
