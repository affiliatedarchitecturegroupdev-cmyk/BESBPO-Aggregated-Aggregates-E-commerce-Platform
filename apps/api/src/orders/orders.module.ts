import { ComplianceDocumentsModule } from "../compliance-documents/compliance-documents.module";
import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [ComplianceDocumentsModule, PricingModule, SuppliersModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
