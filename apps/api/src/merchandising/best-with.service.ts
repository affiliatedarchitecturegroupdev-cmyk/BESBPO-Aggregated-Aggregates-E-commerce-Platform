import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { BestWithAction } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { byStrength, MIN_ORDERS, scoreAffinities } from "./best-with";

const DAY_MS = 24 * 3_600_000;
/** Most suggestions one request returns. */
const MAX_SUGGESTIONS = 12;

export type BestWithSuggestion = { sku: string; source: "PINNED" | "ORDERS"; note: string | null };

/**
 * Best With (docs/best-with.md). The scores are rebuilt from paid, non-test
 * orders a few minutes after start-up and then daily (BEST_WITH=off stops
 * the schedule; admins can rebuild by hand). Customers see which products go
 * together, never how many orders say so — sales volumes stay private.
 */
@Injectable()
export class BestWithService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BestWithService.name);
  private timers: NodeJS.Timeout[] = [];

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.BEST_WITH === "off" || process.env.NODE_ENV === "test") return;
    const run = () => void this.recompute().catch((error: Error) => this.logger.warn(`Best With rebuild: ${error.message}`));
    this.timers = [setTimeout(run, 3 * 60_000), setInterval(run, DAY_MS)];
    this.timers.forEach((t) => t.unref());
  }

  onModuleDestroy() {
    this.timers.forEach((t) => clearTimeout(t));
  }

  /** Rebuilds every score from the orders, in one transaction. */
  async recompute() {
    const orders = await this.prisma.order.findMany({
      where: { paidAt: { not: null }, isTest: false, status: { not: "CANCELLED" } },
      select: { lineItems: { select: { productId: true } } },
    });
    const rows = scoreAffinities(orders.map((o) => o.lineItems.map((l) => l.productId)));
    const computedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.productAffinity.deleteMany(),
      this.prisma.productAffinity.createMany({ data: rows.map((r) => ({ ...r, computedAt })) }),
    ]);
    return { orders: orders.length, pairings: rows.length, computedAt };
  }

  /**
   * What goes best with these products (one on a product page, several in a
   * cart): staff-pinned pairings first, then the strongest order pairings.
   * Leaves out the products themselves, hidden pairings and inactive products.
   */
  async suggestions(skus: string[], limit = 6): Promise<BestWithSuggestion[]> {
    const wanted = [...new Set(skus.map((s) => s.trim()).filter(Boolean))].slice(0, 50);
    if (!wanted.length) return [];
    const products = await this.prisma.product.findMany({ where: { sku: { in: wanted } }, select: { id: true } });
    const ids = products.map((p) => p.id);
    if (!ids.length) return [];
    const [rules, affinities] = await Promise.all([
      this.prisma.bestWithRule.findMany({ where: { productId: { in: ids } }, include: { pairedProduct: { select: { sku: true, isActive: true } } }, orderBy: { createdAt: "asc" } }),
      this.prisma.productAffinity.findMany({
        where: { productId: { in: ids }, orders: { gte: MIN_ORDERS } },
        include: { pairedProduct: { select: { sku: true, isActive: true } } },
      }),
    ]);
    const exclude = new Set([...ids, ...rules.filter((r) => r.action === "HIDE").map((r) => r.pairedProductId)]);
    const out = new Map<string, BestWithSuggestion>();
    for (const rule of rules) {
      if (rule.action !== "PIN" || exclude.has(rule.pairedProductId) || !rule.pairedProduct.isActive) continue;
      out.set(rule.pairedProductId, { sku: rule.pairedProduct.sku, source: "PINNED", note: rule.note });
    }
    // Several products in a cart can point at the same one: keep its strongest pairing.
    const strongest = new Map<string, (typeof affinities)[number]>();
    for (const a of affinities) {
      if (exclude.has(a.pairedProductId) || !a.pairedProduct.isActive) continue;
      const current = strongest.get(a.pairedProductId);
      if (!current || byStrength(numeric(a), numeric(current)) < 0) strongest.set(a.pairedProductId, a);
    }
    for (const a of [...strongest.values()].sort((x, y) => byStrength(numeric(x), numeric(y)))) {
      if (!out.has(a.pairedProductId)) out.set(a.pairedProductId, { sku: a.pairedProduct.sku, source: "ORDERS", note: null });
    }
    return [...out.values()].slice(0, Math.min(Math.max(limit, 1), MAX_SUGGESTIONS));
  }

  /** Staff: the strongest pairings with their numbers, and the rules. */
  async overview() {
    const [pairings, rules, latest] = await Promise.all([
      this.prisma.productAffinity.findMany({
        orderBy: [{ orders: "desc" }, { confidence: "desc" }],
        take: 200,
        include: { product: { select: { sku: true, name: true } }, pairedProduct: { select: { sku: true, name: true } } },
      }),
      this.prisma.bestWithRule.findMany({
        orderBy: { createdAt: "desc" },
        include: { product: { select: { sku: true, name: true } }, pairedProduct: { select: { sku: true, name: true } } },
      }),
      this.prisma.productAffinity.findFirst({ orderBy: { computedAt: "desc" }, select: { computedAt: true } }),
    ]);
    return {
      minOrders: MIN_ORDERS,
      computedAt: latest?.computedAt ?? null,
      pairings: pairings.map((p) => ({ product: p.product, paired: p.pairedProduct, orders: p.orders, confidence: Number(p.confidence), lift: Number(p.lift) })),
      rules: rules.map((r) => ({ product: r.product, paired: r.pairedProduct, action: r.action, note: r.note, createdAt: r.createdAt })),
    };
  }

  async setRule(productSku: string, pairedSku: string, action: BestWithAction, note?: string | null) {
    const [product, paired] = await this.pair(productSku, pairedSku);
    const data = { action, note: action === "PIN" ? note?.trim() || null : null };
    await this.prisma.bestWithRule.upsert({
      where: { productId_pairedProductId: { productId: product.id, pairedProductId: paired.id } },
      create: { productId: product.id, pairedProductId: paired.id, ...data },
      update: data,
    });
    return this.overview();
  }

  async removeRule(productSku: string, pairedSku: string) {
    const [product, paired] = await this.pair(productSku, pairedSku);
    await this.prisma.bestWithRule.deleteMany({ where: { productId: product.id, pairedProductId: paired.id } });
    return this.overview();
  }

  private async pair(productSku: string, pairedSku: string) {
    if (productSku.trim().toUpperCase() === pairedSku.trim().toUpperCase()) throw new BadRequestException("Choose two different products.");
    const found = await this.prisma.product.findMany({ where: { sku: { in: [productSku.trim(), pairedSku.trim()] } }, select: { id: true, sku: true } });
    const product = found.find((p) => p.sku === productSku.trim());
    const paired = found.find((p) => p.sku === pairedSku.trim());
    if (!product || !paired) throw new NotFoundException(`No product with SKU ${!product ? productSku : pairedSku}.`);
    return [product, paired] as const;
  }
}

const numeric = (a: { confidence: unknown; lift: unknown; orders: number }) => ({ confidence: Number(a.confidence), lift: Number(a.lift), orders: a.orders });
