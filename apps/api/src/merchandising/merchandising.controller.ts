import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { MAX_IMAGE_BYTES } from "../compliance-documents/file-type";
import { Public, Roles } from "../common/auth/decorators";
import { UpdateProductMerchandisingDto, UploadProductImageDto } from "./merchandising.dto";
import { MerchandisingService } from "./merchandising.service";

@Controller("merchandising")
export class MerchandisingController {
  constructor(private readonly merchandising: MerchandisingService) {}

  @Public()
  @Get("products")
  overlay() {
    return this.merchandising.overlay();
  }

  @Roles("STAFF", "ADMIN")
  @Patch("products/:sku")
  update(@Param("sku") sku: string, @Body() dto: UpdateProductMerchandisingDto) {
    return this.merchandising.update(sku, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Post("products/:sku/images")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  addImage(@Param("sku") sku: string, @UploadedFile() file: Express.Multer.File | undefined, @Body() dto: UploadProductImageDto) {
    return this.merchandising.addImage(sku, file, dto);
  }

  @Public()
  @Get("images/:id")
  async image(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const { contentType, body } = await this.merchandising.image(id);
    // Image ids never change content, so browsers and CDNs can keep them.
    res.set({ "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
    return new StreamableFile(body);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("images/:id")
  @HttpCode(204)
  removeImage(@Param("id") id: string) {
    return this.merchandising.removeImage(id);
  }
}
