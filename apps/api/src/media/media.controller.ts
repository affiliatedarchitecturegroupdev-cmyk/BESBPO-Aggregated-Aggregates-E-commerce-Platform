import { Body, Controller, Delete, Get, HttpCode, Param, Post, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { MAX_IMAGE_BYTES } from "../compliance-documents/file-type";
import { Public, Roles } from "../common/auth/decorators";
import { MediaService } from "./media.service";

class UploadMediaDto {
  @IsOptional() @IsString() @MaxLength(120) label?: string;
}

@Controller("media")
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Roles("STAFF", "ADMIN")
  @Get()
  list() {
    return this.media.list();
  }

  @Roles("STAFF", "ADMIN")
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: UploadMediaDto) {
    return this.media.upload(file, dto.label);
  }

  @Public()
  @Get(":id")
  async file(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const { contentType, body } = await this.media.file(id);
    // Ids never change content, so browsers and CDNs can keep them.
    res.set({ "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" });
    return new StreamableFile(body);
  }

  @Roles("STAFF", "ADMIN")
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.media.remove(id);
  }
}
