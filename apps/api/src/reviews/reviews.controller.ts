import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Put, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ListReviewsQuery, ModerateReviewDto, SaveReviewDto } from "./reviews.dto";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  /** Average and count per SKU, for product cards. */
  @Public()
  @Get("summaries")
  summaries() {
    return this.reviews.summaries();
  }

  /** Staff moderation queue. */
  @Roles("STAFF", "ADMIN")
  @Get("staff")
  staffList(@Query() query: ListReviewsQuery) {
    return this.reviews.staffList(query.status);
  }

  @Roles("STAFF", "ADMIN")
  @Patch("staff/:id")
  moderate(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ModerateReviewDto) {
    return this.reviews.moderate(user, id, dto);
  }

  @Public()
  @Get("products/:sku")
  forProduct(@Param("sku") sku: string, @Query("page") page?: string) {
    return this.reviews.forProduct(sku, Math.min(50, Math.max(1, Number(page) || 1)));
  }

  /** Signed in: my review of the product, and whether I can write one (a paid order of it). */
  @Get("products/:sku/mine")
  mine(@CurrentUser() user: AuthUser, @Param("sku") sku: string) {
    return this.reviews.mine(user, sku);
  }

  @Put("products/:sku/mine")
  save(@CurrentUser() user: AuthUser, @Param("sku") sku: string, @Body() dto: SaveReviewDto) {
    return this.reviews.save(user, sku, dto);
  }

  @Delete("products/:sku/mine")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param("sku") sku: string) {
    await this.reviews.remove(user, sku);
  }
}
