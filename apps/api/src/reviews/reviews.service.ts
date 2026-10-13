import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ReviewStatus } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { redactContactDetails } from "../common/redact";
import type { ModerateReviewDto, SaveReviewDto } from "./reviews.dto";

/** "Thandi Mokoena" → "Thandi M." — reviews never show a full name, email or company. */
export function reviewerName(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Customer";
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}

type Summary = { average: number | null; count: number; written: number; distribution: Record<1 | 2 | 3 | 4 | 5, number> };

/**
 * Product reviews (PRODUCT_REVIEWS.md). Any signed-in customer can rate a
 * product (stars); a written review needs a paid, uncancelled, non-test
 * order of theirs that included the product. One review per customer per
 * product — saving again updates it. Staff can hide a review; hidden reviews
 * drop out of the average and the list.
 */
@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  private async product(sku: string) {
    const product = await this.prisma.product.findUnique({ where: { sku }, select: { id: true, sku: true, name: true, isActive: true } });
    if (!product || !product.isActive) throw new NotFoundException("Product not found.");
    return product;
  }

  /** The customer's most recent paid order that included the product, if any. */
  private paidOrderFor(userId: string, productId: string) {
    return this.prisma.order.findFirst({
      where: { userId, paidAt: { not: null }, status: { not: "CANCELLED" }, isTest: false, lineItems: { some: { productId } } },
      orderBy: { paidAt: "desc" },
      select: { id: true, orderNumber: true, paidAt: true },
    });
  }

  private summarise(ratings: { rating: number; body: string | null }[]): Summary {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Summary["distribution"];
    for (const r of ratings) distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1;
    const count = ratings.length;
    const average = count ? Math.round((ratings.reduce((n, r) => n + r.rating, 0) / count) * 10) / 10 : null;
    return { average, count, written: ratings.filter((r) => r.body).length, distribution };
  }

  /** Public: the published reviews of a product — the summary over every rating, and the written ones newest first. */
  async forProduct(sku: string, page = 1) {
    const product = await this.product(sku);
    const where = { productId: product.id, status: ReviewStatus.PUBLISHED };
    const [ratings, written] = await Promise.all([
      this.prisma.productReview.findMany({ where, select: { rating: true, body: true } }),
      this.prisma.productReview.findMany({
        where: { ...where, body: { not: null } },
        orderBy: { createdAt: "desc" },
        skip: (Math.max(1, page) - 1) * 10,
        take: 10,
        select: { id: true, rating: true, title: true, body: true, createdAt: true, updatedAt: true, user: { select: { name: true } } },
      }),
    ]);
    return {
      sku: product.sku,
      summary: this.summarise(ratings),
      reviews: written.map(({ user, ...r }) => ({ ...r, reviewer: reviewerName(user.name), verifiedPurchase: true })),
    };
  }

  /** Public: average and count for every product with a published rating — for product cards. */
  async summaries() {
    const groups = await this.prisma.productReview.groupBy({
      by: ["productId"],
      where: { status: ReviewStatus.PUBLISHED },
      _avg: { rating: true },
      _count: { _all: true },
    });
    if (!groups.length) return {};
    const products = await this.prisma.product.findMany({ where: { id: { in: groups.map((g) => g.productId) } }, select: { id: true, sku: true } });
    const sku = new Map(products.map((p) => [p.id, p.sku]));
    return Object.fromEntries(
      groups.filter((g) => sku.has(g.productId)).map((g) => [sku.get(g.productId)!, { average: Math.round((g._avg.rating ?? 0) * 10) / 10, count: g._count._all }]),
    );
  }

  /** The signed-in customer's review of a product and what they may do. */
  async mine(user: AuthUser, sku: string) {
    const product = await this.product(sku);
    const [review, order] = await Promise.all([
      this.prisma.productReview.findUnique({ where: { productId_userId: { productId: product.id, userId: user.id } } }),
      this.paidOrderFor(user.id, product.id),
    ]);
    return {
      review: review && { id: review.id, rating: review.rating, title: review.title, body: review.body, status: review.status, hiddenReason: review.hiddenReason, updatedAt: review.updatedAt },
      canRate: true,
      canWrite: order !== null,
      purchase: order && { orderNumber: order.orderNumber, paidAt: order.paidAt },
    };
  }

  async save(user: AuthUser, sku: string, dto: SaveReviewDto) {
    const product = await this.product(sku);
    const writing = Boolean(dto.title || dto.body);
    const order = await this.paidOrderFor(user.id, product.id);
    if (writing && !order) {
      throw new ForbiddenException("You can give this product stars now. A written review opens once you've bought and paid for it on your account.");
    }
    if (dto.title && !dto.body) throw new BadRequestException("Add a few words to go with the title.");
    const body = dto.body ? redactContactDetails(dto.body).text : null;
    const title = dto.title ? redactContactDetails(dto.title).text : null;
    const data = { rating: dto.rating, title, body, orderId: writing ? order!.id : null };
    const existing = await this.prisma.productReview.findUnique({ where: { productId_userId: { productId: product.id, userId: user.id } } });
    // Editing a review a moderator hid keeps it hidden — staff look at it again.
    const saved = existing
      ? await this.prisma.productReview.update({ where: { id: existing.id }, data })
      : await this.prisma.productReview.create({ data: { ...data, productId: product.id, userId: user.id } });
    return { id: saved.id, rating: saved.rating, title: saved.title, body: saved.body, status: saved.status, contactDetailsRemoved: (dto.body ?? "") !== (body ?? "") || (dto.title ?? "") !== (title ?? "") };
  }

  async remove(user: AuthUser, sku: string) {
    const product = await this.product(sku);
    await this.prisma.productReview.deleteMany({ where: { productId: product.id, userId: user.id } });
  }

  /** Staff: reviews to moderate, newest first, with the product and reviewer's email so they can follow up. */
  async staffList(status: "PUBLISHED" | "HIDDEN" | "ALL" = "ALL") {
    const rows = await this.prisma.productReview.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { product: { select: { sku: true, name: true, slug: true } }, user: { select: { name: true, email: true } } },
    });
    const orderIds = rows.map((r) => r.orderId).filter((id): id is string => Boolean(id));
    const orders = orderIds.length ? await this.prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } }) : [];
    const number = new Map(orders.map((o) => [o.id, o.orderNumber]));
    return rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      hiddenReason: r.hiddenReason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      product: r.product,
      reviewer: { display: reviewerName(r.user.name), name: r.user.name, email: r.user.email },
      orderNumber: r.orderId ? (number.get(r.orderId) ?? null) : null,
    }));
  }

  async moderate(staff: AuthUser, id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.productReview.findUnique({ where: { id } });
    if (!review) throw new NotFoundException("Review not found.");
    const data: Prisma.ProductReviewUpdateInput = {
      status: dto.status,
      hiddenReason: dto.status === "HIDDEN" ? (dto.reason || "Hidden by our team") : null,
      moderatedById: staff.id,
      moderatedAt: new Date(),
    };
    return this.prisma.productReview.update({ where: { id }, data, select: { id: true, status: true, hiddenReason: true } });
  }
}
