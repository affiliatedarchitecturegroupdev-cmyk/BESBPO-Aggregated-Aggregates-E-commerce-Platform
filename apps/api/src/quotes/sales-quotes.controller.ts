import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Res, StreamableFile } from "@nestjs/common";
import { QuoteStatus } from "@aggregates/database";
import type { Response } from "express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { IssueSalesQuoteDto, SalesQuotePriceDto, SaveSalesQuoteDto } from "./dto/sales-quote.dto";
import { SalesQuotesService } from "./sales-quotes.service";

const pdfResponse = (res: Response, file: { fileName: string; pdf: Buffer }, inline = false) => {
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${file.fileName}"`, "Cache-Control": "private, no-store" });
  return new StreamableFile(file.pdf);
};

/** Sales quotations made in the admin panel (docs/sales-quotes.md). */
@Controller("quotations")
export class SalesQuotesController {
  constructor(private readonly quotes: SalesQuotesService) {}

  // The client's private link ------------------------------------------------

  @Public()
  @Get("view/:token")
  view(@Param("token") token: string) {
    return this.quotes.view(token);
  }

  @Public()
  @Get("view/:token/pdf")
  async viewPdf(@Param("token") token: string, @Res({ passthrough: true }) res: Response) {
    return pdfResponse(res, await this.quotes.viewPdf(token));
  }

  @Public()
  @Post("view/:token/accept")
  @HttpCode(200)
  accept(@Param("token") token: string) {
    return this.quotes.accept(token);
  }

  @Public()
  @Post("view/:token/decline")
  @HttpCode(200)
  decline(@Param("token") token: string) {
    return this.quotes.decline(token);
  }

  // Staff ----------------------------------------------------------------------

  @Roles("STAFF", "ADMIN")
  @Get("products")
  products(@Query("q") q = "") {
    return this.quotes.searchProducts(q);
  }

  @Roles("STAFF", "ADMIN")
  @Post("price")
  @HttpCode(200)
  price(@Body() dto: SalesQuotePriceDto) {
    return this.quotes.price(dto);
  }

  @Roles("STAFF", "ADMIN")
  @Get()
  list(@Query("status") status?: string) {
    return this.quotes.list(Object.values(QuoteStatus).includes(status as QuoteStatus) ? (status as QuoteStatus) : undefined);
  }

  @Roles("STAFF", "ADMIN")
  @Post()
  create(@Body() dto: SaveSalesQuoteDto, @CurrentUser() user: AuthUser) {
    return this.quotes.create(dto, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get(":id")
  get(@Param("id") id: string) {
    return this.quotes.get(id);
  }

  @Roles("STAFF", "ADMIN")
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: SaveSalesQuoteDto) {
    return this.quotes.update(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Post(":id/duplicate")
  duplicate(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.duplicate(id, user);
  }

  @Roles("STAFF", "ADMIN")
  @Post(":id/issue")
  @HttpCode(200)
  issue(@Param("id") id: string, @Body() dto: IssueSalesQuoteDto) {
    return this.quotes.issue(id, { email: dto.email });
  }

  @Roles("STAFF", "ADMIN")
  @Get(":id/pdf")
  async pdf(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    return pdfResponse(res, await this.quotes.pdf(id));
  }
}
