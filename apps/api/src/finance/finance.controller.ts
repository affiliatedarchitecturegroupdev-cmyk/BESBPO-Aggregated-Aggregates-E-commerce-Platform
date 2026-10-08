import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateRefundDto, ListOperatingCostsQuery, ListRefundsQuery, OperatingCostDto, SaveDeliveryRatesDto, TestFlagDto } from "./finance.dto";
import { FinanceService } from "./finance.service";

/**
 * Finance foundations (ANALYTICS.md). Staff record refunds as they pay them;
 * everything about cost and profit — operating costs, delivery cost rates,
 * test flags and data quality — is admin-only.
 */
@Controller("finance")
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Roles("STAFF", "ADMIN")
  @Post("refunds")
  createRefund(@Body() dto: CreateRefundDto, @CurrentUser() user: AuthUser) {
    return this.finance.createRefund(dto, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get("refunds")
  listRefunds(@Query() q: ListRefundsQuery) {
    return this.finance.listRefunds(q);
  }

  @Roles("ADMIN")
  @Delete("refunds/:id")
  @HttpCode(204)
  deleteRefund(@Param("id") id: string) {
    return this.finance.deleteRefund(id);
  }

  @Roles("ADMIN")
  @Get("operating-costs")
  listOperatingCosts(@Query() q: ListOperatingCostsQuery) {
    return this.finance.listOperatingCosts(q.from, q.to);
  }

  @Roles("ADMIN")
  @Post("operating-costs")
  createOperatingCost(@Body() dto: OperatingCostDto, @CurrentUser() user: AuthUser) {
    return this.finance.createOperatingCost(dto, user);
  }

  @Roles("ADMIN")
  @Patch("operating-costs/:id")
  updateOperatingCost(@Param("id") id: string, @Body() dto: OperatingCostDto) {
    return this.finance.updateOperatingCost(id, dto);
  }

  @Roles("ADMIN")
  @Delete("operating-costs/:id")
  @HttpCode(204)
  deleteOperatingCost(@Param("id") id: string) {
    return this.finance.deleteOperatingCost(id);
  }

  @Roles("ADMIN")
  @Get("delivery-rates")
  deliveryRates() {
    return this.finance.deliveryRates();
  }

  @Roles("ADMIN")
  @Put("delivery-rates")
  saveDeliveryRates(@Body() dto: SaveDeliveryRatesDto) {
    return this.finance.saveDeliveryRates(dto);
  }

  @Roles("ADMIN")
  @Patch("orders/:id/test")
  setOrderTest(@Param("id") id: string, @Body() dto: TestFlagDto) {
    return this.finance.setOrderTest(id, dto.isTest);
  }

  @Roles("ADMIN")
  @Patch("bookings/:id/test")
  setBookingTest(@Param("id") id: string, @Body() dto: TestFlagDto) {
    return this.finance.setBookingTest(id, dto.isTest);
  }

  @Roles("ADMIN")
  @Get("data-quality")
  dataQuality() {
    return this.finance.dataQuality();
  }
}
