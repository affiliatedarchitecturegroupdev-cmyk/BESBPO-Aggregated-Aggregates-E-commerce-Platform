import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ItemDto, ListDto, ShareDto, UpdateItemDto, UpdateListDto } from "./project-lists.dto";
import { ProjectListsService } from "./project-lists.service";

/** Signed-in customers' project lists; the shared view is public by its unguessable link. */
@Controller("project-lists")
export class ProjectListsController {
  constructor(private readonly lists: ProjectListsService) {}

  @Public()
  @Get("shared/:token")
  shared(@Param("token") token: string) {
    return this.lists.shared(token);
  }

  @Post("shared/:token/copy")
  copyShared(@CurrentUser() user: AuthUser, @Param("token") token: string) {
    return this.lists.copyShared(user, token);
  }

  @Get()
  all(@CurrentUser() user: AuthUser) {
    return this.lists.all(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: ListDto) {
    return this.lists.create(user, dto);
  }

  @Get(":id")
  one(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.lists.one(user, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: UpdateListDto) {
    return this.lists.update(user, id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.lists.remove(user, id);
  }

  @Post(":id/items")
  addItem(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ItemDto) {
    return this.lists.addItem(user, id, dto);
  }

  @Patch(":id/items/:itemId")
  updateItem(@CurrentUser() user: AuthUser, @Param("id") id: string, @Param("itemId") itemId: string, @Body() dto: UpdateItemDto) {
    return this.lists.updateItem(user, id, itemId, dto);
  }

  @Delete(":id/items/:itemId")
  removeItem(@CurrentUser() user: AuthUser, @Param("id") id: string, @Param("itemId") itemId: string) {
    return this.lists.removeItem(user, id, itemId);
  }

  @Post(":id/share")
  share(@CurrentUser() user: AuthUser, @Param("id") id: string, @Body() dto: ShareDto) {
    return this.lists.share(user, id, dto.enabled);
  }

  @Post(":id/duplicate")
  duplicate(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.lists.duplicate(user, id);
  }
}
