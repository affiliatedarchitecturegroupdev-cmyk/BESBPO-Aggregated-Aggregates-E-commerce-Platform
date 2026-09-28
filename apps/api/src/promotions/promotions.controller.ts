import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { Public, Roles } from "../common/auth/decorators";
import { ActivePromotionsQuery, PromotionDto, PromotionEventDto, PromotionStatsQuery } from "./promotions.dto";
import { PromotionsService } from "./promotions.service";

@Controller("promotions")
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  /** The creative live in each slot right now, for an optional category or industry listing. */
  @Public()
  @Get("active")
  active(@Query() query: ActivePromotionsQuery) {
    return this.promotions.active(query);
  }

  /** Counts an impression or click (the storefront sends these; counts only). */
  @Public()
  @Post(":id/events")
  @HttpCode(204)
  event(@Param("id") id: string, @Body() dto: PromotionEventDto) {
    return this.promotions.record(id, dto.type);
  }

  @Roles("STAFF", "ADMIN")
  @Get("stats")
  stats(@Query() query: PromotionStatsQuery) {
    return this.promotions.stats(query.days ?? 30);
  }

  @Roles("STAFF", "ADMIN")
  @Get()
  list() {
    return this.promotions.list();
  }

  @Roles("STAFF", "ADMIN")
  @Post()
  create(@Body() dto: PromotionDto) {
    return this.promotions.create(dto);
  }

  @Roles("STAFF", "ADMIN")
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: PromotionDto) {
    return this.promotions.update(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.promotions.remove(id);
  }
}
