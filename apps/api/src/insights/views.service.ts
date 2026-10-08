import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";

/** The Insights tabs a view can point at ("" is the overview); "finance" is the admin-only P&L. */
export const VIEW_PATHS = ["", "sales", "products", "customers", "hire", "pipeline", "geography", "marketing", "finance"] as const;
const VIEW_KEYS = ["range", "from", "to", "compare", "granularity", "businessLine", "family", "category", "province", "tier", "channel", "paymentMethod", "sort", "months"];
const MAX_VIEWS = 50;

/** Keeps only known filter keys with short, plain values — a saved view is filters, never arbitrary text in a URL. */
export function cleanQuery(query: string): string {
  const input = new URLSearchParams(query.replace(/^\?/, ""));
  const out = new URLSearchParams();
  for (const key of VIEW_KEYS) {
    const v = input.get(key);
    if (v && /^[A-Za-z0-9 _.\-]{1,80}$/.test(v)) out.set(key, v);
  }
  return out.toString();
}

/**
 * Saved Admin → Insights views (ANALYTICS.md, Phase 4): a tab plus its filters,
 * private to the person who saved it unless shared with all staff. Views of
 * the P&L are only listed for admins (the page itself is admin-only too).
 */
@Injectable()
export class InsightsViewsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser) {
    const views = await this.prisma.insightsView.findMany({
      where: { OR: [{ userId: user.id }, { shared: true }], ...(user.role === "ADMIN" ? {} : { path: { not: "finance" } }) },
      orderBy: [{ shared: "asc" }, { name: "asc" }],
      take: 200,
      include: { user: { select: { name: true, email: true } } },
    });
    return views.map((v) => ({
      id: v.id,
      name: v.name,
      path: v.path,
      query: v.query,
      shared: v.shared,
      mine: v.userId === user.id,
      owner: v.user.name ?? v.user.email,
      href: `/admin/insights${v.path ? `/${v.path}` : ""}${v.query ? `?${v.query}` : ""}`,
      createdAt: v.createdAt,
    }));
  }

  async create(user: AuthUser, dto: { name: string; path: string; query?: string; shared?: boolean }) {
    if (!(VIEW_PATHS as readonly string[]).includes(dto.path)) throw new BadRequestException("Unknown Insights page.");
    if (dto.path === "finance" && user.role !== "ADMIN") throw new ForbiddenException("Only admins can save P&L views.");
    const count = await this.prisma.insightsView.count({ where: { userId: user.id } });
    if (count >= MAX_VIEWS) throw new BadRequestException(`You can keep up to ${MAX_VIEWS} saved views — delete one first.`);
    const v = await this.prisma.insightsView.create({ data: { userId: user.id, name: dto.name, path: dto.path, query: cleanQuery(dto.query ?? ""), shared: Boolean(dto.shared) } });
    return { id: v.id, name: v.name, path: v.path, query: v.query, shared: v.shared };
  }

  /** Owners delete their own views; admins can remove any shared view. */
  async remove(user: AuthUser, id: string) {
    const v = await this.prisma.insightsView.findUnique({ where: { id } });
    if (!v || (v.userId !== user.id && !v.shared)) throw new NotFoundException("Saved view not found.");
    if (v.userId !== user.id && user.role !== "ADMIN") throw new ForbiddenException("Only the person who saved this view, or an admin, can delete it.");
    await this.prisma.insightsView.delete({ where: { id } });
  }
}
