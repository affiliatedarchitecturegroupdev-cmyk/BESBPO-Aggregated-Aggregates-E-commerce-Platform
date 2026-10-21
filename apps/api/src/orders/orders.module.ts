import { ComplianceDocumentsModule } from "../compliance-documents/compliance-documents.module";
import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { PricingModule } from "../pricing/pricing.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { OrderDocumentsService } from "../documents/order-documents.service";
import { DdpController } from "./ddp.controller";
import { DdpService } from "./ddp.service";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [ComplianceDocumentsModule, NotificationsModule, PricingModule, SuppliersModule],
  controllers: [OrdersController, DdpController],
  providers: [OrdersService, OrderDocumentsService, DdpService],
  exports: [OrdersService, OrderDocumentsService, DdpService],
})
export class OrdersModule {}
