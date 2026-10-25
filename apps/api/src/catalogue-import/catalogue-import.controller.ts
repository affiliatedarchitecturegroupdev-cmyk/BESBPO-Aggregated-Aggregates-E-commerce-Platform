import { Body, Controller, Get, HttpCode, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MAX_PRICE_LIST_BYTES } from "../supplier-prices/supplier-prices.service";
import { CatalogueImportDto } from "./catalogue-import.dto";
import { CatalogueImportService } from "./catalogue-import.service";

/** Staff import of new products from CSV / Excel, and the products added that way (docs/catalogue-import.md). */
@Controller("catalogue-import")
export class CatalogueImportController {
  constructor(private readonly imports: CatalogueImportService) {}

  /** Public: the products staff added, as the storefront shows them — never costs or suppliers. */
  @Public()
  @Get("products")
  added() {
    return this.imports.added();
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_PRICE_LIST_BYTES, files: 1, fields: 3 } }))
  preview(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: CatalogueImportDto, @CurrentUser() user: AuthUser) {
    return this.imports.preview(file, dto, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff")
  list() {
    return this.imports.list();
  }

  /** Every product added by import, hidden ones too (Admin → Products). Declared before staff/:id. */
  @Roles("STAFF", "ADMIN")
  @Get("staff/products")
  staffProducts() {
    return this.imports.staffProducts();
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/:id")
  get(@Param("id") id: string) {
    return this.imports.get(id);
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/:id/apply")
  @HttpCode(200)
  apply(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.imports.apply(id, user);
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/:id/discard")
  @HttpCode(200)
  discard(@Param("id") id: string) {
    return this.imports.discard(id);
  }
}
