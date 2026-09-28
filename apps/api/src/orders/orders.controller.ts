import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateOrderDto, ListOrdersQuery, PriceCartDto, UpdateOrderStatusDto } from "./dto/create-order.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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

  @Get(":id")
  getOne(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.ordersService.getOrder(id, user);
  }

  @Roles("STAFF", "ADMIN")
  @Patch(":id/status")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto);
  }
}
