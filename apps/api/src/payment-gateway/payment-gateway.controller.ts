import { Body, Controller, Get, Param, ParseEnumPipe, Post, Put, Query } from "@nestjs/common";
import { PaymentMethodKey } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { EligibleMethodsQuery, InitiatePaymentDto, UpdatePaymentMethodDto } from "./payment-gateway.dto";
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
    return this.payments.eligible(query.orderTotal, query.isQuoteOnly ?? false, user);
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

  /** Failover and limits — admins only (AGENTIC_RULES.md rule 8). */
  @Roles("ADMIN")
  @Put(":methodKey")
  update(@Param("methodKey", new ParseEnumPipe(PaymentMethodKey)) methodKey: PaymentMethodKey, @Body() dto: UpdatePaymentMethodDto) {
    return this.payments.update(methodKey, dto);
  }
}
