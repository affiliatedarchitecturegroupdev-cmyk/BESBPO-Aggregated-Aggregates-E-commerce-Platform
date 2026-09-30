import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { seedProductImages } from "./seed-product-images";

/**
 * Runs the product photo import every time the API starts, as well as in
 * Render's pre-deploy step. The import only adds photos not yet imported, so
 * repeating it is harmless — and the photos arrive even if the pre-deploy
 * command on a service was never updated from render.yaml.
 *
 * A failure is logged and never stops the API from starting.
 */
@Injectable()
export class ProductPhotoImport implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProductPhotoImport.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    if (process.env.PRODUCT_PHOTO_IMPORT === "off") return;
    try {
      const created = await seedProductImages(this.prisma);
      const live = await this.prisma.productImage.count({ where: { licence: "CLEARED" } });
      this.logger.log(`Product photos: ${created} added on startup; ${live} live.`);
    } catch (error) {
      this.logger.error(`Product photo import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
