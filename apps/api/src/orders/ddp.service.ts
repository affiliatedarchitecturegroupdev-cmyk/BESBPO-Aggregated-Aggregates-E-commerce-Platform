import { Injectable } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { haversineKm } from "../suppliers/supplier-csv";
import { assessDdp, normaliseDdpPolicy, type DdpAssessment, type DdpLine, type DdpPolicy, type DdpSupplier } from "./ddp";

export const DDP_POLICY_KEY = "ddp-policy";
/** Partner suppliers this far from the site can serve it (the delivery bands stop at 100 km). */
const REACH_KM = 100;

/** What the shopper sees: no supplier IDs, just what comes from each supply point. */
export function publicDdp(a: DdpAssessment) {
  return { ...a, origins: a.origins.map(({ label, products }) => ({ label, products })) };
}

/**
 * Distributed Delivery Premium (docs/delivery-premium.md): the admin's
 * rates, the partner suppliers within reach of a site, and the assessment
 * for a priced order.
 */
@Injectable()
export class DdpService {
  constructor(private readonly prisma: PrismaService) {}

  async policy(): Promise<DdpPolicy> {
    const row = await this.prisma.siteContent.findUnique({ where: { key: DDP_POLICY_KEY } });
    return normaliseDdpPolicy(row?.data as Partial<DdpPolicy> | null);
  }

  async setPolicy(input: Partial<DdpPolicy>, user: AuthUser) {
    const policy = normaliseDdpPolicy({ ...(await this.policy()), ...input });
    const data = policy as unknown as Prisma.InputJsonValue;
    await this.prisma.siteContent.upsert({ where: { key: DDP_POLICY_KEY }, create: { key: DDP_POLICY_KEY, data, updatedById: user.id }, update: { data, updatedById: user.id } });
    return policy;
  }

  /**
   * Verified, active partner suppliers that can serve the site: within
   * REACH_KM of a pin, else in the delivery province. With neither (a cart
   * priced by distance only), none — every kind of supplier counts as its
   * own supply point, the most the order can be charged.
   */
  async suppliersInReach(site: { latitude?: number; longitude?: number; province?: string | null }): Promise<DdpSupplier[]> {
    const hasPin = site.latitude !== undefined && site.longitude !== undefined;
    if (!hasPin && !site.province) return [];
    const rows = await this.prisma.supplierLocation.findMany({
      where: { isActive: true, isVerifiedPartner: true, ...(hasPin ? { latitude: { not: null }, longitude: { not: null } } : { province: site.province! }) },
      select: { id: true, categorySlugs: true, latitude: true, longitude: true },
    });
    return rows.flatMap((s): DdpSupplier[] => {
      if (!hasPin) return [{ id: s.id, categorySlugs: s.categorySlugs, distanceKm: null }];
      const distanceKm = haversineKm({ latitude: site.latitude!, longitude: site.longitude! }, { latitude: s.latitude!, longitude: s.longitude! });
      return distanceKm <= REACH_KM ? [{ id: s.id, categorySlugs: s.categorySlugs, distanceKm }] : [];
    });
  }

  async assess(
    lines: { productId: string; categorySlug: string }[],
    tons: (number | null | undefined)[],
    site: { latitude?: number; longitude?: number; province?: string | null },
  ): Promise<DdpAssessment> {
    const categories = await this.prisma.category.findMany({ where: { slug: { in: [...new Set(lines.map((l) => l.categorySlug))] } }, select: { slug: true, catalogueGroup: true } });
    const groupOf = new Map(categories.map((c) => [c.slug, c.catalogueGroup]));
    const ddpLines: DdpLine[] = lines.map((l, i) => ({ productId: l.productId, categorySlug: l.categorySlug, group: groupOf.get(l.categorySlug) ?? "core", tons: Number(tons[i] ?? 0) || 0 }));
    return assessDdp(ddpLines, await this.suppliersInReach(site), await this.policy());
  }

  /** Admin: how the premium has worked out — paid, non-test orders in the last 90 days. */
  async stats() {
    const since = new Date(Date.now() - 90 * 86_400_000);
    const where = { paidAt: { gte: since }, isTest: false, status: { not: "CANCELLED" as const } };
    const [orders, charged] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({ where: { ...where, ddpFee: { gt: 0 } }, _count: true, _sum: { ddpFee: true } }),
    ]);
    return { since, paidOrders: orders, ordersWithPremium: charged._count, premiumCollected: Number(charged._sum.ddpFee ?? 0) };
  }
}
