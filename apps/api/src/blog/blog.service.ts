import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { BlogCategoryDto, BlogPostDto } from "./blog.dto";

const WITH_CATEGORY = { category: { select: { slug: true, name: true } } } satisfies Prisma.BlogPostInclude;

/**
 * Blog / lightweight CMS: buying guides and technical notes. Readers only
 * ever see published posts; staff write and publish in /admin/blog.
 */
@Injectable()
export class BlogService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
  }

  async createCategory(dto: BlogCategoryDto) {
    try {
      return await this.prisma.blogCategory.create({ data: { slug: dto.slug, name: dto.name.trim() } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new BadRequestException(`The category "${dto.slug}" already exists.`);
      throw error;
    }
  }

  listPublished() {
    return this.prisma.blogPost.findMany({ where: { isPublished: true }, include: WITH_CATEGORY, orderBy: { publishedAt: "desc" } });
  }

  async getPublished(slug: string) {
    const post = await this.prisma.blogPost.findFirst({ where: { slug, isPublished: true }, include: WITH_CATEGORY });
    if (!post) throw new NotFoundException("Post not found.");
    return post;
  }

  listAll() {
    return this.prisma.blogPost.findMany({ include: WITH_CATEGORY, orderBy: [{ isPublished: "asc" }, { updatedAt: "desc" }] });
  }

  async get(id: string) {
    const post = await this.prisma.blogPost.findUnique({ where: { id }, include: WITH_CATEGORY });
    if (!post) throw new NotFoundException("Post not found.");
    return post;
  }

  async create(dto: BlogPostDto) {
    return this.write(null, dto);
  }

  async update(id: string, dto: BlogPostDto) {
    return this.write(await this.get(id), dto);
  }

  async remove(id: string) {
    const deleted = await this.prisma.blogPost.deleteMany({ where: { id } });
    if (deleted.count === 0) throw new NotFoundException("Post not found.");
  }

  private async write(existing: { id: string; isPublished: boolean; publishedAt: Date | null } | null, dto: BlogPostDto) {
    const category = dto.categorySlug ? await this.prisma.blogCategory.findUnique({ where: { slug: dto.categorySlug } }) : null;
    if (dto.categorySlug && !category) throw new BadRequestException(`Unknown blog category: ${dto.categorySlug}`);
    const data = {
      slug: dto.slug,
      title: dto.title.trim(),
      excerpt: dto.excerpt?.trim() || null,
      bodyMarkdown: dto.bodyMarkdown,
      coverImageUrl: dto.coverImageUrl?.trim() || null,
      categoryId: category?.id ?? null,
      authorName: dto.authorName?.trim() || "Aggregated Aggregates",
      isPublished: dto.isPublished,
      // First publication is stamped now; unpublishing keeps the original date for republishing.
      publishedAt: dto.isPublished ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null),
    };
    try {
      return existing
        ? await this.prisma.blogPost.update({ where: { id: existing.id }, data, include: WITH_CATEGORY })
        : await this.prisma.blogPost.create({ data, include: WITH_CATEGORY });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new BadRequestException(`Another post already uses the slug "${dto.slug}".`);
      throw error;
    }
  }
}
