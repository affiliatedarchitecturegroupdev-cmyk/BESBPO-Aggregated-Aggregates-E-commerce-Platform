import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { QuotesService } from "./quotes.service";

@Controller("quotes")
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  create(@Body() dto: CreateQuoteDto) {
    return this.quotesService.createQuote(dto);
  }

  @Get(":id")
  getOne(@Param("id") id: string) {
    return this.quotesService.getQuote(id);
  }

  @Get()
  listForCompany(@Query("companyId") companyId: string) {
    return this.quotesService.listQuotesForCompany(companyId);
  }
}
