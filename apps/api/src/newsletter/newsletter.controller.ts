import { Body, Controller, Delete, Get, Header, HttpCode, Param, Post, Query } from "@nestjs/common";
import { Public, Roles } from "../common/auth/decorators";
import { SubscribeDto, UnsubscribeDto } from "./newsletter.dto";
import { NewsletterService } from "./newsletter.service";

@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletter: NewsletterService) {}

  @Public()
  @Post("subscribe")
  @HttpCode(200)
  subscribe(@Body() dto: SubscribeDto) {
    return this.newsletter.subscribe(dto);
  }

  @Public()
  @Post("unsubscribe")
  @HttpCode(200)
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.newsletter.unsubscribe(dto.token);
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/subscribers")
  list(@Query("status") status?: "active" | "unsubscribed" | "all") {
    return this.newsletter.list(status === "unsubscribed" || status === "all" ? status : "active");
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="newsletter-subscribers.csv"')
  @Header("Cache-Control", "private, no-store")
  export() {
    return this.newsletter.exportCsv();
  }

  /** POPIA: erase a subscriber entirely, on request. */
  @Roles("ADMIN")
  @Delete("admin/subscribers/:id")
  @HttpCode(204)
  erase(@Param("id") id: string) {
    return this.newsletter.erase(id);
  }
}
