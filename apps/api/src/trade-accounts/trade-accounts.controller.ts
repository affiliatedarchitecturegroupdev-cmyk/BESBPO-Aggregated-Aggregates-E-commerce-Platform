import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateCompanyDto } from "./dto/create-company.dto";
import { TradeAccountsService } from "./trade-accounts.service";

@Controller("trade-accounts")
export class TradeAccountsController {
  constructor(private readonly tradeAccountsService: TradeAccountsService) {}

  @Get("tiers")
  listTiers() {
    return this.tradeAccountsService.listCustomerTiers();
  }

  @Post("companies")
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.tradeAccountsService.createCompany(dto);
  }

  @Get("companies/:id/dashboard")
  getDashboard(@Param("id") id: string) {
    return this.tradeAccountsService.getCompanyDashboard(id);
  }
}
