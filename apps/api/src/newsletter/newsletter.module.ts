import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { EmailWebhookController } from "./email-webhook.controller";
import { ListmonkClient } from "./listmonk";
import { NewsletterController } from "./newsletter.controller";
import { NewsletterService } from "./newsletter.service";

@Module({
  imports: [NotificationsModule],
  controllers: [NewsletterController, EmailWebhookController],
  providers: [NewsletterService, ListmonkClient],
})
export class NewsletterModule {}
