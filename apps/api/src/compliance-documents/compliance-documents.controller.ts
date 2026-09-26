import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../common/auth/decorators";
import { ComplianceDocumentsService } from "./compliance-documents.service";

@Public()
@Controller("compliance-documents")
export class ComplianceDocumentsController {
  constructor(private readonly complianceDocumentsService: ComplianceDocumentsService) {}

  @Get()
  listForProduct(@Query("productId") productId: string) {
    return this.complianceDocumentsService.listForProduct(productId);
  }
}
