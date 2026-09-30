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
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { SetLicenceDto, SetSourceLicenceDto, UpdateProductMerchandisingDto, UploadProductImageDto } from "./merchandising.dto";
import { MerchandisingService } from "./merchandising.service";

@Controller("merchandising")
export class MerchandisingController {
  constructor(private readonly merchandising: MerchandisingService) {}

  @Public()
  @Get("products")
  overlay() {
    return this.merchandising.overlay();
  }

  /** Staff: every photo that isn't removed, with its source and permission status. */
  @Roles("STAFF", "ADMIN")
  @Get("staff/products")
  staffOverlay() {
    return this.merchandising.staffOverlay();
  }

  @Roles("STAFF", "ADMIN")
  @Get("image-sources")
  imageSources() {
    return this.merchandising.imageSources();
  }

  /** Permission is a business decision — admins only. */
  @Roles("ADMIN")
  @Post("image-sources/licence")
  @HttpCode(200)
  setSourceLicence(@Body() dto: SetSourceLicenceDto) {
    return this.merchandising.setSourceLicence(dto.sourceName, dto.licence);
  }

  @Roles("ADMIN")
  @Patch("images/:id/licence")
  setImageLicence(@Param("id") id: string, @Body() dto: SetLicenceDto) {
    return this.merchandising.setImageLicence(id, dto.licence);
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
  async image(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined, @Res({ passthrough: true }) res: Response) {
    const { contentType, body, cacheControl } = await this.merchandising.image(id, user);
    res.set({ "Content-Type": contentType, "Cache-Control": cacheControl, "X-Content-Type-Options": "nosniff" });
    return new StreamableFile(body);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("images/:id")
  @HttpCode(204)
  removeImage(@Param("id") id: string) {
    return this.merchandising.removeImage(id);
  }
}
