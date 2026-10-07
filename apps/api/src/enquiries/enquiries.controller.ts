import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateEnquiryDto, ListEnquiriesQuery, UpdateEnquiryDto } from "./enquiries.dto";
import { EnquiriesService } from "./enquiries.service";

@Controller("enquiries")
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  /** Open to guests; a signed-in customer's enquiry is linked to their account. */
  @Public()
  @Post()
  create(@Body() dto: CreateEnquiryDto, @CurrentUser() user?: AuthUser) {
    return this.enquiries.create(dto, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin")
  list(@Query() query: ListEnquiriesQuery) {
    return this.enquiries.list(query);
  }

  @Roles("STAFF", "ADMIN")
  @Patch("admin/:id")
  update(@Param("id") id: string, @Body() dto: UpdateEnquiryDto) {
    return this.enquiries.update(id, dto);
  }

  @Roles("ADMIN")
  @Delete("admin/:id")
  @HttpCode(204)
  erase(@Param("id") id: string) {
    return this.enquiries.erase(id);
  }
}
