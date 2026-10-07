import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { EnquiriesController } from "./enquiries.controller";
import { EnquiriesService } from "./enquiries.service";

@Module({
  imports: [NotificationsModule],
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
})
export class EnquiriesModule {}
