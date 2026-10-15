import { Body, Controller, Get, HttpCode, Param, ParseEnumPipe, Post, Put, Query, Req, type RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { clientIp } from "./payfast/payfast";
import { PaymentMethodKey } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { EligibleMethodsQuery, InitiatePaymentDto, PayfastVisibilityDto, UpdatePaymentMethodDto } from "./payment-gateway.dto";
import { PaymentGatewayService } from "./payment-gateway.service";

@Controller("payment-methods")
export class PaymentGatewayController {
  constructor(private readonly payments: PaymentGatewayService) {}

  /** The enabled payment tiles (Ways to Pay). */
  @Public()
  @Get()
  list() {
    return this.payments.listPublic();
  }

  /** GET /payment-methods/eligible?orderTotal=1250 — at the signed-in caller's tier. */
  @Public()
  @Get("eligible")
  eligible(@Query() query: EligibleMethodsQuery, @CurrentUser() user?: AuthUser) {
    return this.payments.eligible(query.orderTotal, query.isQuoteOnly ?? false, user, query.express ?? false);
  }

  /** Starts paying a PENDING order with the chosen tile; routed to its gateway. */
  @Post("initiate")
  initiate(@Body() dto: InitiatePaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.initiate(dto.orderId, dto.methodKey, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get("routing")
  routing() {
    return this.payments.routing();
  }

  /**
   * PayFast's payment notification (ITN), server to server. Always answered
   * 200 so PayFast doesn't retry; the outcome is logged and shown in
   * Admin -> Payments. Must stay before the ":methodKey" routes.
   */
  @Public()
  @Post("notify/payfast")
  @HttpCode(200)
  async payfastNotify(@Req() req: RawBodyRequest<Request>) {
    const raw = req.rawBody?.toString("utf8") ?? "";
    await this.payments.payfastNotification(raw, clientIp(req.headers["x-forwarded-for"] as string | undefined, req.socket.remoteAddress));
    return "OK";
  }

  @Roles("STAFF", "ADMIN")
  @Get("notifications")
  notifications(@Query("limit") limit?: string) {
    return this.payments.recentNotifications(Number(limit) || 30);
  }

  /** Opens PayFast checkout to customers (after the test payment), or back to staff only. */
  @Roles("ADMIN")
  @Put("payfast/visibility")
  payfastVisibility(@Body() dto: PayfastVisibilityDto, @CurrentUser() user: AuthUser) {
    return this.payments.setPayfastPublic(dto.public, user);
  }

  /** Failover and limits — admins only (AGENTIC_RULES.md rule 8). */
  @Roles("ADMIN")
  @Put(":methodKey")
  update(@Param("methodKey", new ParseEnumPipe(PaymentMethodKey)) methodKey: PaymentMethodKey, @Body() dto: UpdatePaymentMethodDto) {
    return this.payments.update(methodKey, dto);
  }
}
