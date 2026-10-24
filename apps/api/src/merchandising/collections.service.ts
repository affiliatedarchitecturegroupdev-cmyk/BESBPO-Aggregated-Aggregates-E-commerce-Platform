import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { cleanRule, collectionProblems, isLive, slugify, type CollectionRule } from "./collections";
import type { CollectionDto } from "./merchandising.dto";

export type PublicCollection = {
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  skus: string[];
  rule: CollectionRule | null;
  placements: string[];
};

const PUBLIC_FIELDS = { slug: true, title: true, subtitle: true, description: true, skus: true, rule: true, placements: true, isActive: true, startsAt: true, endsAt: true } as const;

/**
 * Admin → Collections (ROADMAP 3.4, docs/merchandising.md). Staff build collections; the storefront asks for the
 * live ones by placement and turns each into products itself (hand-picked SKUs first, then the rule's matches).
 */
@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Staff: every collection, live or not, in display order. */
  list() {
    return this.prisma.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });
  }

  async create(dto: CollectionDto) {
    const data = this.toData(dto);
    try {
      return await this.prisma.collection.create({ data });
    } catch (e) {
      throw this.conflict(e, data.slug);
    }
  }

  async update(id: string, dto: CollectionDto) {
    const data = this.toData(dto);
    try {
      return await this.prisma.collection.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") throw new NotFoundException("No such collection.");
      throw this.conflict(e, data.slug);
    }
  }

  async remove(id: string) {
    await this.prisma.collection.delete({ where: { id } }).catch(() => {
      throw new NotFoundException("No such collection.");
    });
    return { deleted: true };
  }

  /** Storefront: the live collections, optionally only those placed on the homepage or a department. */
  async live(placement?: string): Promise<PublicCollection[]> {
    const rows = await this.prisma.collection.findMany({
      where: { isActive: true, ...(placement ? { placements: { has: placement } } : {}) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: PUBLIC_FIELDS,
    });
    return rows.filter((r) => isLive(r)).map(publicShape);
  }

  /** Storefront: one live collection by its link name (its own page). */
  async bySlug(slug: string): Promise<PublicCollection> {
    const row = await this.prisma.collection.findUnique({ where: { slug }, select: PUBLIC_FIELDS });
    if (!row || !isLive(row)) throw new NotFoundException("No such collection.");
    return publicShape(row);
  }

  private toData(dto: CollectionDto) {
    const rule = cleanRule(dto.rule);
    const skus = [...new Set((dto.skus ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean))];
    const data = {
      slug: (dto.slug?.trim() || slugify(dto.title)).toLowerCase(),
      title: dto.title.trim(),
      subtitle: dto.subtitle?.trim() || null,
      description: dto.description?.trim() || null,
      skus,
      rule: rule ?? Prisma.DbNull,
      placements: [...new Set(dto.placements ?? [])],
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    };
    const problems = collectionProblems({ ...data, rule });
    if (problems.length) throw new BadRequestException(problems.join(" "));
    return data;
  }

  private conflict(e: unknown, slug: string) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return new ConflictException(`Another collection already uses the link /collections/${slug}.`);
    return e;
  }
}

function publicShape(r: { slug: string; title: string; subtitle: string | null; description: string | null; skus: string[]; rule: Prisma.JsonValue; placements: string[] }): PublicCollection {
  return { slug: r.slug, title: r.title, subtitle: r.subtitle, description: r.description, skus: r.skus, rule: (r.rule as CollectionRule | null) ?? null, placements: r.placements };
}
