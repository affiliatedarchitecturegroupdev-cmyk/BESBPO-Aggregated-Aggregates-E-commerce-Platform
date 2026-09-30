import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

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
      include: { category: true, priceBand: true, packagedPriceBands: true, images: { where: { licence: "CLEARED" }, orderBy: { sortOrder: "asc" } } },
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
        images: { where: { licence: "CLEARED" }, orderBy: { sortOrder: "asc" } }, // public: cleared photography only
        complianceDocuments: true,
      },
    });
    if (!product) {
      throw new NotFoundException(`Product not found: ${slug}`);
    }
    return product;
  }
}
