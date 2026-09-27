import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ContentService } from "./content.service";

@Controller("content")
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get()
  all() {
    return this.content.all();
  }

  @Roles("STAFF", "ADMIN")
  @Put(":key")
  save(@Param("key") key: string, @Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.content.save(key, body, user.id);
  }
}
