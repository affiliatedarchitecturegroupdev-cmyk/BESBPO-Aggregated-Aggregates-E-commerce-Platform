import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PricingModule } from "../pricing/pricing.module";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";

@Module({
  imports: [NotificationsModule, PricingModule],
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
