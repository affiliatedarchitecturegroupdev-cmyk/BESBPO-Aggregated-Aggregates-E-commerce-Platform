import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MAX_SCHEDULE_FILE_BYTES } from "./bar-schedule";
import { CreateScheduleDto, ListSchedulesQuery, QuoteScheduleDto, UpdateScheduleDto } from "./cut-and-bend.dto";
import { CutAndBendService } from "./cut-and-bend.service";

const download = (res: Response, name: string, contentType: string, body: Buffer) => {
  res.set({
    "Content-Type": contentType,
    "Content-Length": String(body.length),
    "Content-Disposition": `attachment; filename="${name}"`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  return new StreamableFile(body);
};

@Controller("cut-and-bend")
export class CutAndBendController {
  constructor(private readonly schedules: CutAndBendService) {}

  /** Open to guests; a signed-in customer's schedule is linked to their account so they can accept the quote online. */
  @Public()
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_SCHEDULE_FILE_BYTES, files: 1, fields: 20, fieldSize: 256 * 1024 } }))
  create(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: CreateScheduleDto, @CurrentUser() user?: AuthUser) {
    return this.schedules.create(file, dto, user);
  }

  // ---- Customers ----

  @Get("mine")
  mine(@CurrentUser() user: AuthUser) {
    return this.schedules.mine(user);
  }

  @Get("mine/:id")
  mineOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.schedules.mineOne(user, id);
  }

  @Post("mine/:id/accept")
  accept(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.schedules.respond(user, id, true);
  }

  @Post("mine/:id/decline")
  decline(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.schedules.respond(user, id, false);
  }

  // ---- Staff ----

  @Roles("STAFF", "ADMIN")
  @Get("admin")
  list(@Query() query: ListSchedulesQuery) {
    return this.schedules.list(query.status);
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/:id")
  detail(@Param("id") id: string) {
    return this.schedules.detail(id);
  }

  @Roles("STAFF", "ADMIN")
  @Patch("admin/:id")
  update(@Param("id") id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedules.update(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Post("admin/:id/quote")
  quote(@Param("id") id: string, @Body() dto: QuoteScheduleDto) {
    return this.schedules.quote(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/:id/file")
  async file(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const f = await this.schedules.file(id);
    return download(res, f.name, f.contentType, f.body);
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/:id/csv")
  async csv(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const f = await this.schedules.csv(id);
    return download(res, f.name, "text/csv; charset=utf-8", Buffer.from(f.body, "utf8"));
  }

  @Roles("ADMIN")
  @Delete("admin/:id")
  @HttpCode(204)
  erase(@Param("id") id: string) {
    return this.schedules.erase(id);
  }
}
