import { Controller, Get, Query } from "@nestjs/common";
import { ComplianceDocumentsService } from "./compliance-documents.service";

@Controller("compliance-documents")
export class ComplianceDocumentsController {
  constructor(private readonly complianceDocumentsService: ComplianceDocumentsService) {}

  @Get()
  listForProduct(@Query("productId") productId: string) {
    return this.complianceDocumentsService.listForProduct(productId);
  }
}
