import { Body, Controller, Get, Headers, HttpCode, Param, ParseEnumPipe, Post, Put, Query, Req, type RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { clientIp } from "./payfast/payfast";
import { PaymentGateway, PaymentMethodKey } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DepositPolicyDto, EligibleMethodsQuery, InitiatePaymentDto, PauseGatewayDto, PayfastVisibilityDto, UpdatePaymentMethodDto } from "./payment-gateway.dto";
import { PaymentGatewayService } from "./payment-gateway.service";
import { GatewayHealthService } from "./gateway-health.service";
import { PaymentsService } from "./payments.service";

@Controller("payment-methods")
export class PaymentGatewayController {
  constructor(
    private readonly payments: PaymentGatewayService,
    private readonly ledger: PaymentsService,
    private readonly health: GatewayHealthService,
  ) {}

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
    return this.payments.initiate(dto.orderId, dto.methodKey, user, dto.plan ?? "FULL");
  }

  /** The deposit policy — public, so the storefront can explain deposits. */
  @Public()
  @Get("deposit-policy")
  depositPolicy() {
    return this.ledger.depositPolicy();
  }

  @Roles("ADMIN")
  @Put("deposit-policy")
  setDepositPolicy(@Body() dto: DepositPolicyDto, @CurrentUser() user: AuthUser) {
    return this.ledger.setDepositPolicy(dto, user);
  }

  /** Admin: stop sending payments to a gateway (its methods use their fallback), or resume it. */
  @Roles("ADMIN")
  @Post("gateways/:gateway/pause")
  pause(@Param("gateway", new ParseEnumPipe(PaymentGateway)) gateway: PaymentGateway, @Body() dto: PauseGatewayDto) {
    return this.health.pause(gateway, dto.reason ?? "");
  }

  @Roles("ADMIN")
  @Post("gateways/:gateway/resume")
  resume(@Param("gateway", new ParseEnumPipe(PaymentGateway)) gateway: PaymentGateway) {
    return this.health.resume(gateway);
  }

  /** Staff: check lay-by plans and unconfirmed payments with the gateways now (it also runs hourly). */
  @Roles("STAFF", "ADMIN")
  @Post("sync")
  sync() {
    return this.ledger.sync();
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

  /** Peach Payments' webhook (signed form post). Always 200; the status is confirmed with Peach. */
  @Public()
  @Post("notify/peach")
  @HttpCode(200)
  async peachNotify(@Req() req: RawBodyRequest<Request>) {
    await this.ledger.peachWebhook(req.rawBody?.toString("utf8") ?? "", clientIp(req.headers["x-forwarded-for"] as string | undefined, req.socket.remoteAddress));
    return "OK";
  }

  /** Stitch's webhook (Svix-signed). Always 200; the status is confirmed with Stitch's API. */
  @Public()
  @Post("notify/stitch")
  @HttpCode(200)
  async stitchNotify(
    @Req() req: RawBodyRequest<Request>,
    @Headers("svix-id") id?: string,
    @Headers("svix-timestamp") timestamp?: string,
    @Headers("svix-signature") signature?: string,
  ) {
    await this.ledger.stitchWebhook(req.rawBody?.toString("utf8") ?? "", { id, timestamp, signature }, clientIp(req.headers["x-forwarded-for"] as string | undefined, req.socket.remoteAddress));
    return { received: true };
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
