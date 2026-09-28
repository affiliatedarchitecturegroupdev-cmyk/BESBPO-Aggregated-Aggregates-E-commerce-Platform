import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "../../common/auth/decorators";
import { CatalogueFeedService } from "./catalogue-feed.service";

/**
 * GET /api/v1/channels/catalogue-feed.csv — register this URL as a
 * scheduled data feed in Meta Commerce Manager (one feed serves Instagram
 * and Facebook Shop). Meta polls it; nothing is pushed.
 */
@Controller("channels")
export class CatalogueFeedController {
  constructor(private readonly feed: CatalogueFeedService) {}

  @Public()
  @Get("catalogue-feed.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Cache-Control", "public, max-age=900")
  csv() {
    return this.feed.csv();
  }
}
