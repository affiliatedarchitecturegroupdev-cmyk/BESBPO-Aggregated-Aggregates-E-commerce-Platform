import { Controller, ForbiddenException, Headers, HttpCode, Post, Req, ServiceUnavailableException, type RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { Public } from "../common/auth/decorators";
import { NotificationsService } from "../notifications/notifications.service";
import { NewsletterService } from "./newsletter.service";

/**
 * Resend's delivery webhook (docs/email.md): POST /api/v1/email/webhooks/resend.
 * Verified with RESEND_WEBHOOK_SECRET. Records delivered / bounced /
 * complained on the message, suppresses hard bounces and complaints, and a
 * spam complaint also unsubscribes the address from the newsletter.
 */
@Controller("email/webhooks")
export class EmailWebhookController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly newsletter: NewsletterService,
  ) {}

  @Public()
  @Post("resend")
  @HttpCode(200)
  async resend(
    @Req() req: RawBodyRequest<Request>,
    @Headers("svix-id") id?: string,
    @Headers("svix-timestamp") timestamp?: string,
    @Headers("svix-signature") signature?: string,
  ) {
    const result = await this.notifications.resendWebhook(req.rawBody, { id, timestamp, signature });
    if (!result.accepted) {
      if (result.reason === "not-configured") throw new ServiceUnavailableException("The email webhook isn't configured.");
      throw new ForbiddenException("Invalid signature.");
    }
    for (const email of result.complained) await this.newsletter.unsubscribeByEmail(email);
    return { received: true };
  }
}
