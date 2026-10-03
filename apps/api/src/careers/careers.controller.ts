import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { Public, Roles } from "../common/auth/decorators";
import { MAX_CV_BYTES } from "../compliance-documents/file-type";
import { ApplicationDto, ApplicationUpdateDto, VacancyDto } from "./careers.dto";
import { CareersService } from "./careers.service";

@Controller("careers")
export class CareersController {
  constructor(private readonly careers: CareersService) {}

  @Public()
  @Get("vacancies")
  listOpen() {
    return this.careers.listOpen();
  }

  @Public()
  @Get("vacancies/:slug")
  openBySlug(@Param("slug") slug: string) {
    return this.careers.openBySlug(slug);
  }

  /** Public: an application (for a vacancy, or the talent pool) with a CV file. */
  @Public()
  @Post("applications")
  @UseInterceptors(FileInterceptor("cv", { limits: { fileSize: MAX_CV_BYTES, files: 1, fields: 20 } }))
  apply(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: ApplicationDto) {
    return this.careers.apply(file, dto);
  }

  // ---- Staff ----

  @Roles("STAFF", "ADMIN")
  @Get("admin/vacancies")
  listAll() {
    return this.careers.listAll();
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/vacancies/:id")
  get(@Param("id") id: string) {
    return this.careers.get(id);
  }

  @Roles("STAFF", "ADMIN")
  @Post("admin/vacancies")
  create(@Body() dto: VacancyDto) {
    return this.careers.create(dto);
  }

  @Roles("STAFF", "ADMIN")
  @Patch("admin/vacancies/:id")
  update(@Param("id") id: string, @Body() dto: VacancyDto) {
    return this.careers.update(id, dto);
  }

  @Roles("ADMIN")
  @Delete("admin/vacancies/:id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.careers.remove(id);
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/applications")
  listApplications(@Query("vacancyId") vacancyId?: string, @Query("status") status?: string) {
    return this.careers.listApplications({ vacancyId, status });
  }

  @Roles("STAFF", "ADMIN")
  @Patch("admin/applications/:id")
  updateApplication(@Param("id") id: string, @Body() dto: ApplicationUpdateDto) {
    return this.careers.updateApplication(id, dto);
  }

  @Roles("STAFF", "ADMIN")
  @Get("admin/applications/:id/cv")
  async cv(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const { application, body } = await this.careers.cv(id);
    res.set({
      "Content-Type": application.cvContentType,
      "Content-Length": String(body.length),
      "Content-Disposition": `attachment; filename="${application.cvFileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    return new StreamableFile(body);
  }

  @Roles("ADMIN")
  @Delete("admin/applications/:id")
  @HttpCode(204)
  deleteApplication(@Param("id") id: string) {
    return this.careers.deleteApplication(id);
  }
}
