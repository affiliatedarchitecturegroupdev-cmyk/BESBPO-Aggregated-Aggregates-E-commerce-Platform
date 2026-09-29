import { Body, Controller, Get, HttpCode, Param, ParseEnumPipe, Patch, Post, Query, Res, StreamableFile } from "@nestjs/common";
import type { Response } from "express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateOrderDto, ListOrdersQuery, PriceCartDto, UpdateOrderStatusDto } from "./dto/create-order.dto";
import { DOCUMENT_KINDS, OrderDocumentsService, type DocumentKind } from "../documents/order-documents.service";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly documents: OrderDocumentsService,
  ) {}

  /** Prices a cart at the caller's tier (Retail when signed out) — nothing is saved. */
  @Public()
  @Post("price")
  @HttpCode(200)
  price(@Body() dto: PriceCartDto, @CurrentUser() user?: AuthUser) {
    return this.ordersService.priceCart(dto, user);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthUser) {
    return this.ordersService.createOrder(dto, user);
  }

  @Get("mine")
  listMine(@CurrentUser() user: AuthUser) {
    return this.ordersService.listMine(user);
  }

  @Roles("STAFF", "ADMIN")
  @Get()
  listAll(@Query() query: ListOrdersQuery) {
    return this.ordersService.listAll(query.status);
  }

  /** Staff: whether tax invoices can be issued yet, and what's missing. */
  @Roles("STAFF", "ADMIN")
  @Get("invoicing-status")
  invoicingStatus() {
    const problems = this.documents.invoicingProblems();
    return { ready: problems.length === 0, problems };
  }

  @Get(":id")
  getOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.getOrder(id, user);
  }

  /** GET /orders/:id/documents/confirmation | delivery-note | invoice — a PDF for the buyer, their company, or staff. */
  @Get(":id/documents/:kind")
  async document(
    @Param("id") id: string,
    @Param("kind", new ParseEnumPipe(Object.fromEntries(DOCUMENT_KINDS.map((k) => [k, k])))) kind: DocumentKind,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { fileName, pdf } = await this.documents.render(id, kind, user);
    res.set({ "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, no-store" });
    return new StreamableFile(pdf);
  }

  @Roles("STAFF", "ADMIN")
  @Post(":id/invoice")
  issueInvoice(@Param("id") id: string) {
    return this.documents.issueInvoice(id);
  }

  @Roles("STAFF", "ADMIN")
  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
