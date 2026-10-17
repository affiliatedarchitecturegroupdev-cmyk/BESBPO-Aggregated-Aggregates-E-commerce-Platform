import { Body, Controller, Delete, Get, Param, Post, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreatePaymentLinkDto, PayLinkDto, RecordPaymentDto } from "./payment-gateway.dto";
import { PaymentsService } from "./payments.service";

/** An order's payments (docs/payments.md): what's owed, deposits, balances, lay-by, and staff tools. */
@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  /** The buyer's order page: paid so far, the balance, the deposit on offer, and the tiles for each. */
  @Get("orders/:id")
  options(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.payments.options(id, user);
  }

  /** Back from a gateway's page: check the started payments with the gateway, then the same as above. */
  @Post("orders/:id/refresh")
  refresh(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.payments.refreshOrder(id, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get("outstanding")
  outstanding() {
    return this.payments.outstanding();
  }

  @Roles("STAFF", "ADMIN")
  @Get("orders/:id/ledger")
  ledger(@Param("id") id: string) {
    return this.payments.ledger(id);
  }

  /** Staff: money received by EFT, recorded against the order (confirms it if it's the first payment). */
  @Roles("STAFF", "ADMIN")
  @Post("orders/:id/record")
  record(@Param("id") id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: AuthUser) {
    return this.payments.recordManual(id, dto, user);
  }

  /** Staff: a link the customer can pay without signing in (the URL is returned once). */
  @Roles("STAFF", "ADMIN")
  @Post("orders/:id/links")
  createLink(@Param("id") id: string, @Body() dto: CreatePaymentLinkDto, @CurrentUser() user: AuthUser) {
    return this.payments.createLink(id, dto, user);
  }

  @Roles("STAFF", "ADMIN")
  @Delete("links/:linkId")
  revokeLink(@Param("linkId") linkId: string) {
    return this.payments.revokeLink(linkId);
  }
}

/** The public pay page behind a payment link: /pay/{token} on the storefront. */
@Controller("payment-links")
export class PaymentLinksController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get(":token")
  view(@Param("token") token: string) {
    return this.payments.linkView(token);
  }

  @Public()
  @Post(":token/refresh")
  refresh(@Param("token") token: string) {
    return this.payments.linkView(token, true);
  }

  @Public()
  @Post(":token/pay")
  pay(@Param("token") token: string, @Body() dto: PayLinkDto) {
    return this.payments.payLink(token, dto.methodKey);
  }

  @Public()
  @Get(":token/proforma")
  async proforma(@Param("token") token: string, @Res({ passthrough: true }) res: Response) {
    const { fileName, pdf } = await this.payments.linkProforma(token);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store" });
    return new StreamableFile(pdf);
  }
}
