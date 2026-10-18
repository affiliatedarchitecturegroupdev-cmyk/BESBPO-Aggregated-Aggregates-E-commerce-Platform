import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PricingModule } from "../pricing/pricing.module";
import { StorageModule } from "../storage/storage.module";
import { HealthController } from "./health.controller";
import { UptimeService } from "./uptime.service";

@Module({
  imports: [PricingModule, StorageModule, NotificationsModule],
  controllers: [HealthController],
  providers: [UptimeService],
})
export class HealthModule {}
