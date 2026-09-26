import { Module } from "@nestjs/common";
import { ComplianceDocumentsController } from "./compliance-documents.controller";
import { ComplianceDocumentsService } from "./compliance-documents.service";

@Module({
  controllers: [ComplianceDocumentsController],
  providers: [ComplianceDocumentsService],
  exports: [ComplianceDocumentsService],
})
export class ComplianceDocumentsModule {}
