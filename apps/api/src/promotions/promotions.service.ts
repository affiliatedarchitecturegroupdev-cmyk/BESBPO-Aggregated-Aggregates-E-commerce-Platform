import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PromotionSlot } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { PromotionDto } from "./promotions.dto";

const PUBLIC_FIELDS = { id: true, slot: true, title: true, imageUrl: true, linkUrl: true, categorySlug: true, industrySlug: true } as const;

/** Today's date in South Africa, as the UTC-midnight Date a @db.Date column stores. */
export function saDay(now = new Date()): Date {
  const local = new Date(now.getTime() + 2 * 3600_000); // SAST is UTC+2 all year
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

/**
 * The scaled-down ad system: a handful of banner slots staff fill with
 * creative. Each slot shows its first active promotion (lowest sortOrder,
 * newest first on a tie) whose date window contains now. The category
 * banner can be targeted at one category or industry listing; targeted
 * creative beats untargeted there. Impressions and clicks are counted per
 * day — counts only, nothing about the visitor.
 */
@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: the live creative per slot, for the listing being viewed. */
  async active(context: { category?: string; industry?: string } = {}, now = new Date()) {
    const live = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      // Lowest order number wins; on a tie the newest promotion replaces the older one.
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: PUBLIC_FIELDS,
    });
    const targets = (p: (typeof live)[number]) =>
      (p.categorySlug !== null && p.categorySlug === context.category) || (p.industrySlug !== null && p.industrySlug === context.industry);
    const untargeted = (p: (typeof live)[number]) => p.categorySlug === null && p.industrySlug === null;

    const bySlot: Partial<Record<PromotionSlot, (typeof live)[number]>> = {};
    for (const slot of Object.values(PromotionSlot)) {
      const inSlot = live.filter((p) => p.slot === slot);
      bySlot[slot] = inSlot.find(targets) ?? inSlot.find(untargeted);
      if (!bySlot[slot]) delete bySlot[slot];
    }
    return bySlot;
  }

  list() {
    return this.prisma.promotion.findMany({ orderBy: [{ slot: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
  }

  create(dto: PromotionDto) {
    return this.prisma.promotion.create({ data: this.data(dto) });
  }

  async update(id: string, dto: PromotionDto) {
    try {
      return await this.prisma.promotion.update({ where: { id }, data: this.data(dto) });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new NotFoundException("Promotion not found.");
      throw error;
    }
  }

  async remove(id: string) {
    const deleted = await this.prisma.promotion.deleteMany({ where: { id } });
    if (deleted.count === 0) throw new NotFoundException("Promotion not found.");
  }

  /** Counts one impression or click on today's row. Unknown or switched-off promotions are ignored. */
  async record(id: string, type: "impression" | "click") {
    const exists = await this.prisma.promotion.count({ where: { id, isActive: true } });
    if (!exists) return;
    const day = saDay();
    const field = type === "click" ? "clicks" : "impressions";
    await this.prisma.promotionStat.upsert({
      where: { promotionId_day: { promotionId: id, day } },
      update: { [field]: { increment: 1 } },
      create: { promotionId: id, day, [field]: 1 },
    });
  }

  /** Staff: impressions, clicks and click-through rate per promotion over the last N days, with the daily series. */
  async stats(days = 30) {
    const since = new Date(saDay().getTime() - (days - 1) * 86_400_000);
    const [promotions, rows] = await Promise.all([
      this.prisma.promotion.findMany({ select: { id: true, slot: true, title: true, isActive: true, categorySlug: true, industrySlug: true } }),
      this.prisma.promotionStat.findMany({ where: { day: { gte: since } }, orderBy: { day: "asc" } }),
    ]);
    return {
      since: since.toISOString().slice(0, 10),
      days,
      promotions: promotions
        .map((promotion) => {
          const series = rows.filter((r) => r.promotionId === promotion.id);
          const impressions = series.reduce((sum, r) => sum + r.impressions, 0);
          const clicks = series.reduce((sum, r) => sum + r.clicks, 0);
          return {
            ...promotion,
            impressions,
            clicks,
            clickThroughRate: impressions > 0 ? Math.round((clicks / impressions) * 10000) / 100 : null,
            daily: series.map((r) => ({ day: r.day.toISOString().slice(0, 10), impressions: r.impressions, clicks: r.clicks })),
          };
        })
        .sort((a, b) => b.impressions - a.impressions),
    };
  }

  private data(dto: PromotionDto) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && endsAt <= startsAt) throw new BadRequestException("The end date must be after the start date.");
    const categorySlug = dto.categorySlug ?? null;
    const industrySlug = dto.industrySlug ?? null;
    if ((categorySlug || industrySlug) && dto.slot !== PromotionSlot.CATEGORY_TOP_BANNER) {
      throw new BadRequestException("Only the category banner can target a category or industry.");
    }
    if (categorySlug && industrySlug) throw new BadRequestException("Target a category or an industry, not both.");
    return {
      slot: dto.slot,
      title: dto.title.trim(),
      imageUrl: dto.imageUrl.trim(),
      linkUrl: dto.linkUrl?.trim() || null,
      startsAt,
      endsAt,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
      categorySlug,
      industrySlug,
    };
  }
}
