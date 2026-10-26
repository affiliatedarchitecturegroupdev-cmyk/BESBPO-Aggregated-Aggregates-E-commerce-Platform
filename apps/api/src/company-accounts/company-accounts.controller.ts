import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AcceptInviteDto, ApprovalDecisionDto, CompanySettingsDto, InviteMemberDto, UpdateMemberDto } from "./company-accounts.dto";
import { CompanyAccountsService } from "./company-accounts.service";

/** A company account's team, invitations, settings and order approvals (docs/company-accounts.md). */
@Controller("company")
export class CompanyAccountsController {
  constructor(private readonly company: CompanyAccountsService) {}

  @Get("team")
  team(@CurrentUser() user: AuthUser) {
    return this.company.team(user);
  }

  @Post("team/invites")
  invite(@Body() dto: InviteMemberDto, @CurrentUser() user: AuthUser) {
    return this.company.invite(user, dto);
  }

  @Delete("team/invites/:id")
  @HttpCode(204)
  revoke(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.company.revokeInvite(user, id);
  }

  /** Public: what an invitation is for (the join page, before signing in). */
  @Public()
  @Get("invites/preview")
  preview(@Query("token") token: string) {
    return this.company.invitePreview(token ?? "");
  }

  @Post("invites/accept")
  @HttpCode(200)
  accept(@Body() dto: AcceptInviteDto, @CurrentUser() user: AuthUser) {
    return this.company.acceptInvite(user, dto.token);
  }

  @Patch("team/members/:id")
  updateMember(@Param("id") id: string, @Body() dto: UpdateMemberDto, @CurrentUser() user: AuthUser) {
    return this.company.updateMember(user, id, dto);
  }

  @Delete("team/members/:id")
  @HttpCode(204)
  removeMember(@Param("id") id: string, @CurrentUser() user: AuthUser) {
    return this.company.removeMember(user, id);
  }

  @Put("settings")
  settings(@Body() dto: CompanySettingsDto, @CurrentUser() user: AuthUser) {
    return this.company.updateSettings(user, dto);
  }

  @Post("approvals/:orderId")
  @HttpCode(200)
  decide(@Param("orderId") orderId: string, @Body() dto: ApprovalDecisionDto, @CurrentUser() user: AuthUser) {
    return this.company.decide(user, orderId, dto);
  }
}
