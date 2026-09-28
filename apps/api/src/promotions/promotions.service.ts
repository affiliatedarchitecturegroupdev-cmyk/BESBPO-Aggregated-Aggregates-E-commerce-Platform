import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, PromotionSlot } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { PromotionDto } from "./promotions.dto";

/**
 * The scaled-down ad system: a handful of banner slots staff fill with
 * creative. Each slot shows its first active promotion (lowest sortOrder,
 * newest first on a tie) whose date window contains now.
 */
@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: the live creative per slot. */
  async active(now = new Date()) {
    const live = await this.prisma.promotion.findMany({
      where: {
        isActive: true,
        AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
      },
      // Lowest order number wins; on a tie the newest promotion replaces the older one.
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, slot: true, title: true, imageUrl: true, linkUrl: true },
    });
    const bySlot: Partial<Record<PromotionSlot, (typeof live)[number]>> = {};
    for (const promo of live) bySlot[promo.slot] ??= promo;
    return bySlot;
  }

  list() {
    return this.prisma.promotion.findMany({ orderBy: [{ slot: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
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

  private data(dto: PromotionDto) {
    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && endsAt <= startsAt) throw new BadRequestException("The end date must be after the start date.");
    return {
      slot: dto.slot,
      title: dto.title.trim(),
      imageUrl: dto.imageUrl.trim(),
      linkUrl: dto.linkUrl?.trim() || null,
      startsAt,
      endsAt,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    };
  }
}
