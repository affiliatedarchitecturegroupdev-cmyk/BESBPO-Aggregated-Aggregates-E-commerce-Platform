import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApproveLineDto, MapLineDto, PriceListUploadDto, SupplierPriceListDto } from "./supplier-prices.dto";
import { MAX_PRICE_LIST_BYTES, SupplierPricesService } from "./supplier-prices.service";

/** Supplier price lists and the sell prices approved from them (docs/supplier-prices.md). */
@Controller("prices")
export class SupplierPricesController {
  constructor(private readonly prices: SupplierPricesService) {}

  /** Public: live supplier prices as the storefront shows them — sell prices per tier, never costs or suppliers. */
  @Public()
  @Get("live")
  live() {
    return this.prices.publicPrices();
  }

  // --- Supplier portal (ROADMAP 1.5): the supplier's own lists ------------------------------------------------

  @Roles("SUPPLIER")
  @Post("supplier/lists")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_PRICE_LIST_BYTES, files: 1, fields: 3 } }))
  supplierUpload(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: SupplierPriceListDto, @CurrentUser() user: AuthUser) {
    return this.prices.supplierUpload(file, dto, user);
  }

  @Roles("SUPPLIER")
  @Get("supplier/lists")
  supplierLists(@CurrentUser() user: AuthUser) {
    return this.prices.supplierLists(user);
  }

  @Roles("SUPPLIER")
  @Get("supplier/lists/:id")
  supplierList(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.prices.supplierList(id, user);
  }

  // --- Staff ---------------------------------------------------------------------------------------------------

  @Roles("STAFF", "ADMIN")
  @Post("staff/lists")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_PRICE_LIST_BYTES, files: 1, fields: 6 } }))
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: PriceListUploadDto, @CurrentUser() user: AuthUser) {
    return this.prices.upload(file, dto, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/lists")
  lists() {
    return this.prices.lists();
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/lists/:id")
  list(@Param("id") id: string) {
    return this.prices.list(id);
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/lists/:id/approve-all")
  @HttpCode(200)
  approveAll(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.prices.approveAll(id, user);
  }

  @Roles("STAFF", "ADMIN")
  @Put("staff/lines/:id")
  map(@Param("id") id: string, @Body() dto: MapLineDto) {
    return this.prices.mapLine(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/lines/:id/approve")
  @HttpCode(200)
  approve(@Param("id") id: string, @Body() dto: ApproveLineDto, @CurrentUser() user: AuthUser) {
    return this.prices.approveLine(id, user, dto.price ?? null);
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/lines/:id/reject")
  @HttpCode(200)
  reject(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.prices.rejectLine(id, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/live")
  staffLive(@Query("sku") sku?: string) {
    return this.prices.live({ sku: sku || undefined });
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/coverage")
  coverage() {
    return this.prices.coverage();
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/history/:sku")
  history(@Param("sku") sku: string) {
    return this.prices.history(sku);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("staff/live/:id")
  @HttpCode(204)
  withdraw(@Param("id") id: string) {
    return this.prices.withdraw(id);
  }
}
