import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ComplianceDocumentsService } from "./compliance-documents.service";
import { UploadDocumentDto } from "./dto/upload-document.dto";
import { MAX_DOCUMENT_BYTES } from "./file-type";

@Controller("compliance-documents")
export class ComplianceDocumentsController {
  constructor(private readonly documents: ComplianceDocumentsService) {}

  @Public()
  @Get()
  listForProduct(@Query("sku") sku = "") {
    return this.documents.listForProduct(sku);
  }

  @Roles("STAFF", "ADMIN")
  @Get("recent")
  listRecent() {
    return this.documents.listRecent();
  }

  @Roles("STAFF", "ADMIN")
  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 } }))
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Body() dto: UploadDocumentDto, @CurrentUser() user: AuthUser) {
    return this.documents.upload(file, dto, user);
  }

  /** Public route: order documents are checked against the caller inside the service. */
  @Public()
  @Get(":id/file")
  async download(@Param("id") id: string, @CurrentUser() user: AuthUser | undefined, @Res({ passthrough: true }) res: Response) {
    const { document, body } = await this.documents.download(id, user);
    res.set({
      "Content-Type": document.contentType,
      "Content-Length": String(body.length),
      "Content-Disposition": `inline; filename="${document.fileName}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": document.orderId ? "private, no-store" : "public, max-age=300",
    });
    return new StreamableFile(body);
  }

  @Roles("STAFF", "ADMIN")
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.documents.remove(id);
  }
}
