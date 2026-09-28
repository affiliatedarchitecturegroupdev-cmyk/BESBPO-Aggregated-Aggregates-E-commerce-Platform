import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  ServiceUnavailableException,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { IsIn } from "class-validator";
import { Public, Roles } from "../../common/auth/decorators";
import { WhatsAppService } from "./whatsapp.service";

class CloseConversationDto {
  @IsIn(["PAID", "ABANDONED"]) state!: "PAID" | "ABANDONED";
}

/**
 * WhatsApp Business API webhook: GET for Meta's one-time verification
 * handshake, POST for inbound messages. POSTs must carry Meta's signature.
 */
@Controller("channels/whatsapp")
export class WhatsAppController {
  constructor(private readonly whatsApp: WhatsAppService) {}

  @Public()
  @Get("webhook")
  verify(@Query("hub.mode") mode: string, @Query("hub.verify_token") token: string, @Query("hub.challenge") challenge: string) {
    const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (!expected) throw new ServiceUnavailableException("WhatsApp webhook isn't configured yet.");
    if (mode !== "subscribe" || token !== expected || !/^[\w-]{1,100}$/.test(challenge ?? "")) {
      throw new BadRequestException("Webhook verification failed.");
    }
    return challenge;
  }

  @Public()
  @Post("webhook")
  @HttpCode(200)
  async receive(@Req() req: RawBodyRequest<Request>, @Headers("x-hub-signature-256") signature: string | undefined, @Body() body: unknown) {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) throw new ServiceUnavailableException("WhatsApp webhook isn't configured yet.");
    if (!WhatsAppService.verifySignature(req.rawBody, signature, secret)) throw new ForbiddenException("Invalid signature.");
    for (const message of WhatsAppService.textMessages(body)) {
      await this.whatsApp.handle(message);
    }
    return { received: true };
  }

  @Roles("STAFF", "ADMIN")
  @Get("conversations")
  open() {
    return this.whatsApp.listOpen();
  }

  @Roles("STAFF", "ADMIN")
  @Post("conversations/:id/close")
  @HttpCode(200)
  close(@Param("id") id: string, @Body() dto: CloseConversationDto) {
    return this.whatsApp.close(id, dto.state);
  }
}
