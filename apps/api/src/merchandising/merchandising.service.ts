import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { ImageLicence } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { detectImageType, MAX_IMAGE_BYTES } from "../compliance-documents/file-type";
import { PrismaService } from "../common/prisma.service";
import { StorageService } from "../storage/storage.service";
import { UpdateProductMerchandisingDto, UploadProductImageDto } from "./merchandising.dto";
import { SEED_IMAGE_PREFIX, seedImagePath } from "./seed-product-images";

const STAFF_IMAGE_FIELDS = { id: true, altText: true, licence: true, sourceName: true, sourceUrl: true, sourceNote: true, importKey: true } as const;

/**
 * CMS for the catalogue: descriptions, photography, visibility and featured
 * placement. Names, units and every price stay owned by the pricing
 * framework workbook (AGENTIC_RULES.md rule 1) — none of them is editable here.
 *
 * Photography is licence-aware: only CLEARED photos reach the public
 * catalogue, the image route, or the Meta feed. Sourced candidates wait as
 * PERMISSION_PENDING until staff record permission for their source.
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
        images: { where: { licence: "CLEARED" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, altText: true } },
      },
    });
  }

  /** Staff: the same overlay with every photo that isn't removed, and where each came from. */
  staffOverlay() {
    return this.prisma.product.findMany({
      orderBy: { sku: "asc" },
      select: {
        sku: true,
        isActive: true,
        description: true,
        featuredRank: true,
        images: { where: { licence: { not: "REMOVED" } }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: STAFF_IMAGE_FIELDS },
      },
    });
  }

  /** Staff: sourced photography grouped by who owns it — the permission checklist. */
  async imageSources() {
    const images = await this.prisma.productImage.findMany({
      where: { sourceName: { not: null }, licence: { not: "REMOVED" } },
      select: { id: true, licence: true, sourceName: true, sourceUrl: true, sourceNote: true, product: { select: { sku: true, name: true } } },
      orderBy: [{ sourceName: "asc" }],
    });
    const bySource = new Map<string, { sourceName: string; urls: Set<string>; notes: Set<string>; products: Map<string, string>; cleared: number; pending: number; imageIds: string[] }>();
    for (const image of images) {
      const key = image.sourceName!;
      const entry = bySource.get(key) ?? { sourceName: key, urls: new Set(), notes: new Set(), products: new Map(), cleared: 0, pending: 0, imageIds: [] as string[] };
      if (image.sourceUrl) entry.urls.add(image.sourceUrl);
      if (image.sourceNote) entry.notes.add(image.sourceNote);
      entry.products.set(image.product.sku, image.product.name);
      if (image.licence === "CLEARED") entry.cleared++;
      else entry.pending++;
      entry.imageIds.push(image.id);
      bySource.set(key, entry);
    }
    return [...bySource.values()]
      .map((e) => ({
        sourceName: e.sourceName,
        sourceUrls: [...e.urls],
        notes: [...e.notes],
        products: [...e.products].map(([sku, name]) => ({ sku, name })),
        imageIds: e.imageIds,
        cleared: e.cleared,
        pending: e.pending,
      }))
      .sort((a, b) => b.pending + b.cleared - (a.pending + a.cleared) || a.sourceName.localeCompare(b.sourceName));
  }

  /** Admin: record (or withdraw) a source's permission — applies to all of its photos at once. */
  async setSourceLicence(sourceName: string, licence: "CLEARED" | "PERMISSION_PENDING") {
    const { count } = await this.prisma.productImage.updateMany({
      where: { sourceName, licence: { not: "REMOVED" } },
      data: { licence },
    });
    if (count === 0) throw new NotFoundException(`No photos from ${sourceName}.`);
    return { sourceName, licence, updated: count };
  }

  /** Admin: clear or hold back one photo (e.g. a single shot the source didn't approve). */
  async setImageLicence(id: string, licence: "CLEARED" | "PERMISSION_PENDING") {
    const image = await this.prisma.productImage.findUnique({ where: { id }, select: { licence: true } });
    if (!image || image.licence === "REMOVED") throw new NotFoundException("Image not found.");
    return this.prisma.productImage.update({ where: { id }, data: { licence }, select: STAFF_IMAGE_FIELDS });
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

  /**
   * The image file. Anything not CLEARED is staff-only (and REMOVED is gone
   * for everyone), so a pending photo can't leak through a guessed link.
   */
  async image(id: string, user?: AuthUser) {
    const image = await this.prisma.productImage.findUnique({ where: { id } });
    const staff = !!user && STAFF_ROLES.includes(user.role);
    if (!image || image.licence === ImageLicence.REMOVED || (image.licence !== ImageLicence.CLEARED && !staff)) {
      throw new NotFoundException("Image not found.");
    }
    const seeded = image.storageKey.startsWith(SEED_IMAGE_PREFIX);
    let body: Buffer;
    if (seeded) {
      const path = seedImagePath(image.storageKey.split("/").pop() ?? "");
      if (!path) throw new NotFoundException("Image file is missing.");
      body = await readFile(path).catch(() => {
        throw new NotFoundException("Image file is missing.");
      });
    } else {
      const object = await this.storage.get(image.storageKey);
      if (!object) throw new NotFoundException("Image file is missing.");
      body = object.body;
    }
    // Own uploads never change, so they cache for good. A sourced photo's permission can be
    // withdrawn, so it caches for an hour; a pending one is never cached outside the staff browser.
    const cacheControl =
      image.licence !== ImageLicence.CLEARED ? "private, no-store" : seeded ? "public, max-age=3600" : "public, max-age=31536000, immutable";
    return { contentType: image.contentType, body, cacheControl };
  }

  async removeImage(id: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id }, select: { storageKey: true, importKey: true } });
    if (!image) throw new NotFoundException("Image not found.");
    if (image.importKey) {
      // Keep the record (the file stays in the repository) so the next deploy doesn't re-import it.
      await this.prisma.productImage.update({ where: { id }, data: { licence: ImageLicence.REMOVED } });
      return;
    }
    await this.prisma.productImage.delete({ where: { id } });
    await this.storage.remove(image.storageKey);
  }

  private async product(sku: string) {
    const product = await this.prisma.product.findUnique({ where: { sku }, select: { id: true, sku: true } });
    if (!product) throw new NotFoundException(`Unknown product: ${sku}`);
    return product;
  }
}
