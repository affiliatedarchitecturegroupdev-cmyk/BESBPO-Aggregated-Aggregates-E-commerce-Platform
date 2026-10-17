import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentGatewayAdapterFactory } from "./adapters/adapter.factory";
import { LayupAdapter } from "./adapters/layup.adapter";
import { LulapayAdapter } from "./adapters/lulapay.adapter";
import { ManualEftAdapter } from "./adapters/manual-eft.adapter";
import { OzowAdapter } from "./adapters/ozow.adapter";
import { PayFastAdapter } from "./adapters/payfast.adapter";
import { PeachAdapter } from "./adapters/peach.adapter";
import { StitchAdapter } from "./adapters/stitch.adapter";
import { GatewayHealthService } from "./gateway-health.service";
import { PaymentGatewayController } from "./payment-gateway.controller";
import { PaymentGatewayService } from "./payment-gateway.service";
import { PaymentLinksController, PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [OrdersModule, NotificationsModule],
  controllers: [PaymentGatewayController, PaymentsController, PaymentLinksController],
  providers: [
    PaymentGatewayService,
    PaymentsService,
    GatewayHealthService,
    PaymentGatewayAdapterFactory,
    PayFastAdapter,
    PeachAdapter,
    OzowAdapter,
    StitchAdapter,
    LulapayAdapter,
    ManualEftAdapter,
    LayupAdapter,
  ],
  exports: [PaymentGatewayService, PaymentsService],
})
export class PaymentGatewayModule {}
