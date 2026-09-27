import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import {
  ApplyForTradeAccountDto,
  CreateDeliveryAddressDto,
  ListApplicationsQuery,
  ReviewApplicationDto,
} from "./dto/trade-account.dto";
import { TradeAccountsService } from "./trade-accounts.service";

@Controller("trade-accounts")
export class TradeAccountsController {
  constructor(private readonly tradeAccounts: TradeAccountsService) {}

  @Public()
  @Get("tiers")
  listTiers() {
    return this.tradeAccounts.listCustomerTiers();
  }

  @Post("apply")
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyForTradeAccountDto) {
    return this.tradeAccounts.apply(user, dto);
  }

  @Get("me")
  myDashboard(@CurrentUser() user: AuthUser) {
    return this.tradeAccounts.myDashboard(user);
  }

  @Post("me/addresses")
  addAddress(@CurrentUser() user: AuthUser, @Body() dto: CreateDeliveryAddressDto) {
    return this.tradeAccounts.addDeliveryAddress(user, dto);
  }

  @Delete("me/addresses/:id")
  @HttpCode(204)
  removeAddress(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.tradeAccounts.removeDeliveryAddress(user, id);
  }

  @Roles("STAFF", "ADMIN")
  @Get("applications")
  listApplications(@Query() query: ListApplicationsQuery) {
    return this.tradeAccounts.listApplications(query.status);
  }

  @Roles("STAFF", "ADMIN")
  @Post("applications/:companyId/review")
  review(@Param("companyId") companyId: string, @Body() dto: ReviewApplicationDto) {
    return this.tradeAccounts.review(companyId, dto);
  }
}
