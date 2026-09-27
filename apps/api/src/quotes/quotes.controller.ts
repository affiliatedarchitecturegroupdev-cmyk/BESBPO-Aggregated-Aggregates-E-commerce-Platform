import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateQuoteDto, ListQuotesQuery, RespondToQuoteDto, UpdateQuoteDto } from "./dto/create-quote.dto";
import { QuotesService } from "./quotes.service";

@Controller("quotes")
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  /** Open to guests; a signed-in requester's quote is linked to them and priced at their tier. */
  @Public()
  @Post()
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user?: AuthUser) {
    return this.quotes.create(dto, user);
  }

  @Get("mine")
  listMine(@CurrentUser() user: AuthUser) {
    return this.quotes.listMine(user);
  }

  @Roles("STAFF", "ADMIN")
  @Get()
  listAll(@Query() query: ListQuotesQuery) {
    return this.quotes.listAll(query.status);
  }

  @Get(":id")
  get(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.quotes.get(id, user);
  }

  @Roles("STAFF", "ADMIN")
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateQuoteDto) {
    return this.quotes.update(id, dto);
  }

  @Post(":id/respond")
  respond(@Param("id") id: string, @Body() dto: RespondToQuoteDto, @CurrentUser() user: AuthUser) {
    return this.quotes.respond(id, dto, user);
  }
}
