import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { Public, Roles } from "../common/auth/decorators";
import { CollectionsService } from "./collections.service";
import { CollectionDto } from "./merchandising.dto";
import { TopSellersService } from "./top-sellers.service";

/** Collections and best sellers for the storefront (docs/merchandising.md), and staff's collection editor. */
@Controller("merchandising")
export class StorefrontMerchandisingController {
  constructor(
    private readonly collections: CollectionsService,
    private readonly topSellers: TopSellersService,
  ) {}

  /** `?placement=HOMEPAGE` or `DEPARTMENT:<slug>`; without it, every live collection. */
  @Public()
  @Get("collections")
  live(@Query("placement") placement?: string) {
    return this.collections.live(placement || undefined);
  }

  @Public()
  @Get("collections/:slug")
  bySlug(@Param("slug") slug: string) {
    return this.collections.bySlug(slug);
  }

  /** Ranked SKUs only — never order counts. `?days=30&province=Gauteng&limit=24`. */
  @Public()
  @Get("top-sellers")
  sellers(@Query("days") days?: string, @Query("province") province?: string, @Query("limit") limit?: string) {
    return this.topSellers.topSellers(Number(days) || 30, province || undefined, Number(limit) || 24);
  }

  @Public()
  @Get("top-sellers/provinces")
  provinces(@Query("days") days?: string) {
    return this.topSellers.trendingProvinces(Number(days) || 30);
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/collections")
  list() {
    return this.collections.list();
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/collections")
  create(@Body() dto: CollectionDto) {
    return this.collections.create(dto);
  }

  @Roles("STAFF", "ADMIN")
  @Put("staff/collections/:id")
  update(@Param("id") id: string, @Body() dto: CollectionDto) {
    return this.collections.update(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("staff/collections/:id")
  remove(@Param("id") id: string) {
    return this.collections.remove(id);
  }
}
