import { Body, Controller, Delete, Get, HttpCode, Post, Put, Query } from "@nestjs/common";
import { Public, Roles } from "../common/auth/decorators";
import { BestWithService } from "./best-with.service";
import { BestWithPairDto, BestWithRuleDto } from "./merchandising.dto";

/** Best With (docs/best-with.md): suggestions for the storefront, and staff's pins and hides. */
@Controller("merchandising/best-with")
export class BestWithController {
  constructor(private readonly bestWith: BestWithService) {}

  /** `?skus=A,B` — one product's page, or a whole cart. */
  @Public()
  @Get()
  suggestions(@Query("skus") skus = "", @Query("limit") limit?: string) {
    return this.bestWith.suggestions(skus.split(","), Number(limit) || 6);
  }

  @Roles("STAFF", "ADMIN")
  @Get("overview")
  overview() {
    return this.bestWith.overview();
  }

  @Roles("STAFF", "ADMIN")
  @Put("rules")
  setRule(@Body() dto: BestWithRuleDto) {
    return this.bestWith.setRule(dto.productSku, dto.pairedSku, dto.action, dto.note);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("rules")
  removeRule(@Body() dto: BestWithPairDto) {
    return this.bestWith.removeRule(dto.productSku, dto.pairedSku);
  }

  @Roles("STAFF", "ADMIN")
  @Post("recompute")
  @HttpCode(200)
  recompute() {
    return this.bestWith.recompute();
  }
}
