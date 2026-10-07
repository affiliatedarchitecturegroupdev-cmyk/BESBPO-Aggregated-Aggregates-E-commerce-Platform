import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PricingModule } from "../pricing/pricing.module";
import { BookingsAdminController, BookingsController, HireCoverageController, PartnerPortalController } from "./bookings.controller";
import { BookingsScheduler } from "./bookings.scheduler";
import { BookingsService } from "./bookings.service";
import { HirePartnersService } from "./hire-partners.service";

@Module({
  imports: [NotificationsModule, PricingModule],
  // The admin controller is registered first so "bookings/admin" isn't read as a booking id.
  controllers: [BookingsAdminController, BookingsController, PartnerPortalController, HireCoverageController],
  providers: [BookingsService, HirePartnersService, BookingsScheduler],
})
export class BookingsModule {}
