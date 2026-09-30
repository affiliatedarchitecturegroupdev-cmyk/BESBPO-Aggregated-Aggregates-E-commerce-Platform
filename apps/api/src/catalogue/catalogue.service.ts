import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { PUBLIC_IMAGE_FIELDS } from "../merchandising/merchandising.service";

/** Public: cleared photography only, without storage keys or staff sourcing notes. */
const PUBLIC_IMAGES = { where: { licence: "CLEARED" }, orderBy: { sortOrder: "asc" }, select: PUBLIC_IMAGE_FIELDS } as const;

@Injectable()
export class CatalogueService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: true } } },
    });
  }

  async listProducts(params: { categorySlug?: string; search?: string }) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        category: params.categorySlug ? { slug: params.categorySlug } : undefined,
        name: params.search ? { contains: params.search, mode: "insensitive" } : undefined,
      },
      include: { category: true, priceBand: true, packagedPriceBands: true, images: PUBLIC_IMAGES },
      orderBy: { name: "asc" },
    });
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        priceBand: true,
        packagedPriceBands: true,
        images: PUBLIC_IMAGES,
        complianceDocuments: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found: ${slug}`);
    }
    return product;
  }
}
