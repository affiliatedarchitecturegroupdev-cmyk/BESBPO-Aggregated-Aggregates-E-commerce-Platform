import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersModule } from "../orders/orders.module";
import { StorageModule } from "../storage/storage.module";
import { DeliveriesController, ProofOfDeliveryController } from "./deliveries.controller";
import { DeliveriesService } from "./deliveries.service";
import { SupplierPortalController } from "./supplier-portal.controller";
import { SupplierPortalService } from "./supplier-portal.service";

@Module({
  imports: [OrdersModule, NotificationsModule, StorageModule],
  controllers: [DeliveriesController, ProofOfDeliveryController, SupplierPortalController],
  providers: [DeliveriesService, SupplierPortalService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
