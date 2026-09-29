import { Module } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { EmailSender, WhatsAppTemplateSender } from "./providers";

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailSender, WhatsAppTemplateSender],
  exports: [NotificationsService],
})
export class NotificationsModule {}
