import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { Roles } from "../common/auth/decorators";
import type { AuthUser } from "../common/auth/auth-user";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ChangeRoleDto, GrantRoleDto } from "./team.dto";
import { TeamService } from "./team.service";

/** Admin → Team. Admins only — staff can't grant access. */
@Roles("ADMIN")
@Controller("team")
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  list() {
    return this.team.list();
  }

  @Post()
  grant(@CurrentUser() actor: AuthUser, @Body() dto: GrantRoleDto) {
    return this.team.grant(actor, dto.email, dto.role);
  }

  @Patch(":userId")
  change(@CurrentUser() actor: AuthUser, @Param("userId") userId: string, @Body() dto: ChangeRoleDto) {
    return this.team.change(actor, userId, dto.role);
  }
}
