import { Body, Controller, Get, HttpCode, Param, Patch, Post, Put, Query } from "@nestjs/common";
import type { ProjectStatus } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AcceptProposalDto, CreateProjectDto, EstimateDto, ProposalDto, RecordMilestoneDto, UpdateProjectDto } from "./projects.dto";
import { ProjectsService } from "./projects.service";

/** Design-and-build projects (docs/projects.md): briefs, proposals and stage payments. */
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Public()
  @Post("estimate")
  @HttpCode(200)
  estimate(@Body() dto: EstimateDto) {
    return this.projects.estimate(dto.package, dto.brief);
  }

  /** Public: send a brief, signed in or not. */
  @Public()
  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user?: AuthUser) {
    return this.projects.create(dto, user);
  }

  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.projects.mine(user);
  }

  @Public()
  @Get("proposal/:token")
  view(@Param("token") token: string) {
    return this.projects.view(token);
  }

  @Public()
  @Post("proposal/:token/accept")
  @HttpCode(200)
  accept(@Param("token") token: string, @Body() dto: AcceptProposalDto) {
    return this.projects.accept(token, dto);
  }

  // --- Staff ---

  @Roles("STAFF", "ADMIN")
  @Get("staff")
  list(@Query("status") status?: ProjectStatus) {
    return this.projects.list(status);
  }

  @Roles("STAFF", "ADMIN")
  @Get("staff/:id")
  get(@Param("id") id: string) {
    return this.projects.get(id);
  }

  @Roles("STAFF", "ADMIN")
  @Patch("staff/:id")
  update(@Param("id") id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.update(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Put("staff/:id/proposal")
  saveProposal(@Param("id") id: string, @Body() dto: ProposalDto) {
    return this.projects.saveProposal(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/:id/send")
  @HttpCode(200)
  send(@Param("id") id: string) {
    return this.projects.sendProposal(id);
  }

  @Roles("STAFF", "ADMIN")
  @Post("staff/milestones/:id/paid")
  @HttpCode(200)
  paid(@Param("id") id: string, @Body() dto: RecordMilestoneDto, @CurrentUser() user: AuthUser) {
    return this.projects.recordMilestone(id, dto.reference, user);
  }
}
