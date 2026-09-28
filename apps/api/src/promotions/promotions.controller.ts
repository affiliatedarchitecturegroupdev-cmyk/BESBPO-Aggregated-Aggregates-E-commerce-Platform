import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import { Public, Roles } from "../common/auth/decorators";
import { PromotionDto } from "./promotions.dto";
import { PromotionsService } from "./promotions.service";

@Controller("promotions")
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  /** The creative live in each slot right now. */
  @Public()
  @Get("active")
  active() {
    return this.promotions.active();
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
