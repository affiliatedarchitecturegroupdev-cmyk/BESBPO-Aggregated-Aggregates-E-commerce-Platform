import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { detectImageType, MAX_IMAGE_BYTES } from "../compliance-documents/file-type";
import { PrismaService } from "../common/prisma.service";
import { StorageService } from "../storage/storage.service";
import { UpdateProductMerchandisingDto, UploadProductImageDto } from "./merchandising.dto";

/**
 * CMS for the catalogue: descriptions, photography, visibility and featured
 * placement. Names, units and every price stay owned by the pricing
 * framework workbook (AGENTIC_RULES.md rule 1) — none of them is editable here.
 */
@Injectable()
export class MerchandisingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Everything the storefront layers over the workbook catalogue, in one request. */
  overlay() {
    return this.prisma.product.findMany({
      orderBy: { sku: "asc" },
      select: {
        sku: true,
        isActive: true,
        description: true,
        featuredRank: true,
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, altText: true } },
      },
    });
  }

  async update(sku: string, dto: UpdateProductMerchandisingDto) {
    await this.product(sku);
    return this.prisma.product.update({
      where: { sku },
      data: {
        description: dto.description === undefined ? undefined : dto.description.trim() || null,
        isActive: dto.isActive,
        featuredRank: dto.featuredRank,
      },
      select: { sku: true, isActive: true, description: true, featuredRank: true },
    });
  }

  async addImage(sku: string, file: Express.Multer.File | undefined, dto: UploadProductImageDto) {
    if (!file?.buffer?.length) throw new BadRequestException("Attach an image.");
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException("Images must be 5MB or smaller.");
    const type = detectImageType(file.buffer);
    if (!type) throw new BadRequestException("Upload a PNG, JPEG or WebP image.");
    const product = await this.product(sku);

    const storageKey = `product-images/${product.sku}/${randomUUID()}.${type.extension}`;
    await this.storage.put(storageKey, file.buffer, type.contentType);
    try {
      const count = await this.prisma.productImage.count({ where: { productId: product.id } });
      return await this.prisma.productImage.create({
        data: {
          productId: product.id,
          storageKey,
          contentType: type.contentType,
          sizeBytes: file.size,
          altText: dto.altText?.trim() || null,
          sortOrder: count,
        },
        select: { id: true, altText: true, sortOrder: true },
      });
    } catch (error) {
      await this.storage.remove(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async image(id: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id } });
    if (!image) throw new NotFoundException("Image not found.");
    const object = await this.storage.get(image.storageKey);
    if (!object) throw new NotFoundException("Image file is missing.");
    return { contentType: image.contentType, body: object.body };
  }

  async removeImage(id: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id }, select: { storageKey: true } });
    if (!image) throw new NotFoundException("Image not found.");
    await this.prisma.productImage.delete({ where: { id } });
    await this.storage.remove(image.storageKey);
  }

  private async product(sku: string) {
    const product = await this.prisma.product.findUnique({ where: { sku }, select: { id: true, sku: true } });
    if (!product) throw new NotFoundException(`Unknown product: ${sku}`);
    return product;
  }
}
