import { Body, Controller, Get, HttpCode, Param, Post, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MAX_BOQ_BYTES } from "./boq";
import { BoqService } from "./boq.service";

/** Bill of quantities upload (docs/boq-upload.md). */
@Controller("boq")
export class BoqController {
  constructor(private readonly boq: BoqService) {}

  /** Reads the file and suggests products. Nothing is stored. */
  @Public()
  @Post("parse")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_BOQ_BYTES, files: 1, fields: 2 } }))
  parse(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.boq.parse(file);
  }

  /** The confirmed lines become a quote request, with the file attached (`payload` is the quote request as JSON). */
  @Public()
  @Post("submit")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_BOQ_BYTES, files: 1, fields: 2, fieldSize: 256 * 1024 } }))
  submit(@UploadedFile() file: Express.Multer.File | undefined, @Body("payload") payload: string | undefined, @CurrentUser() user?: AuthUser) {
    return this.boq.submit(file, payload, user);
  }

  @Get("quotes/:id/file")
  async download(@Param("id") id: string, @CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const file = await this.boq.download(id, user);
    res.set({ "Content-Type": file.contentType, "Content-Disposition": `attachment; filename="${file.fileName.replace(/"/g, "")}"`, "Cache-Control": "private, no-store" });
    return new StreamableFile(file.body);
  }
}
