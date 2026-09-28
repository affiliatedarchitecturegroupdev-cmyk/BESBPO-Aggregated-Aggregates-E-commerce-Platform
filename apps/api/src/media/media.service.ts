import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { MAX_IMAGE_BYTES, detectImageType } from "../compliance-documents/file-type";
import { PrismaService } from "../common/prisma.service";
import { StorageService } from "../storage/storage.service";

/**
 * Staff-uploaded creative for promotions and blog covers. Referenced
 * elsewhere as "upload:<id>" and served publicly by id; the file type is
 * detected from its content, never trusted from the upload.
 */
@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list() {
    return this.prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, contentType: true, sizeBytes: true, createdAt: true },
    });
  }

  async upload(file: Express.Multer.File | undefined, label: string | undefined) {
    if (!file?.buffer?.length) throw new BadRequestException("Attach an image.");
    if (file.size > MAX_IMAGE_BYTES) throw new BadRequestException("Images must be 5MB or smaller.");
    const type = detectImageType(file.buffer);
    if (!type) throw new BadRequestException("Upload a PNG, JPEG or WebP image.");
    const storageKey = `media/${randomUUID()}.${type.extension}`;
    await this.storage.put(storageKey, file.buffer, type.contentType);
    try {
      return await this.prisma.mediaAsset.create({
        data: {
          storageKey,
          contentType: type.contentType,
          sizeBytes: file.size,
          label: (label?.trim() || file.originalname || "Image").slice(0, 120),
        },
        select: { id: true, label: true, contentType: true, sizeBytes: true, createdAt: true },
      });
    } catch (error) {
      await this.storage.remove(storageKey).catch(() => undefined);
      throw error;
    }
  }

  async file(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Image not found.");
    const object = await this.storage.get(asset.storageKey);
    if (!object) throw new NotFoundException("Image file is missing.");
    return { contentType: asset.contentType, body: object.body };
  }

  /** Deletes an upload that nothing uses any more. */
  async remove(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Image not found.");
    const ref = `upload:${id}`;
    const [promotions, posts] = await Promise.all([
      this.prisma.promotion.count({ where: { imageUrl: ref } }),
      this.prisma.blogPost.count({ where: { coverImageUrl: ref } }),
    ]);
    if (promotions + posts > 0) {
      throw new ConflictException(`This image is still used by ${promotions} promotion(s) and ${posts} article(s).`);
    }
    await this.prisma.mediaAsset.delete({ where: { id } });
    await this.storage.remove(asset.storageKey);
  }
}
