import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ApplyForCreditDto, DecideCreditDto, ListCreditQuery } from "./credit.dto";
import { CreditService } from "./credit.service";

/** Trade credit (docs/trade-credit.md): apply, see the account, and staff decisions. */
@Controller("credit")
export class CreditController {
  constructor(private readonly credit: CreditService) {}

  @Get("me")
  mine(@CurrentUser() user: AuthUser) {
    return this.credit.mine(user);
  }

  @Post("apply")
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyForCreditDto) {
    return this.credit.apply(user, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Get("accounts")
  list(@Query() query: ListCreditQuery) {
    return this.credit.list(query.status);
  }

  @Roles("STAFF", "ADMIN")
  @Get("receivables")
  receivables() {
    return this.credit.receivables();
  }

  @Roles("STAFF", "ADMIN")
  @Post("accounts/:companyId/decide")
  decide(@Param("companyId") companyId: string, @Body() dto: DecideCreditDto, @CurrentUser() user: AuthUser) {
    return this.credit.decide(companyId, dto, user);
  }
}
