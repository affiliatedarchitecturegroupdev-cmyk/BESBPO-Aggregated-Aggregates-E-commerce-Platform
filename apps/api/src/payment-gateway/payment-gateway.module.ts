import { Module } from "@nestjs/common";
import { PaymentGatewayAdapterFactory } from "./adapters/adapter.factory";
import { LulapayAdapter } from "./adapters/lulapay.adapter";
import { ManualEftAdapter } from "./adapters/manual-eft.adapter";
import { OzowAdapter } from "./adapters/ozow.adapter";
import { PayFastAdapter } from "./adapters/payfast.adapter";
import { PeachAdapter } from "./adapters/peach.adapter";
import { StitchAdapter } from "./adapters/stitch.adapter";
import { PaymentGatewayController } from "./payment-gateway.controller";
import { PaymentGatewayService } from "./payment-gateway.service";

@Module({
  controllers: [PaymentGatewayController],
  providers: [PaymentGatewayService, PaymentGatewayAdapterFactory, PayFastAdapter, PeachAdapter, OzowAdapter, StitchAdapter, LulapayAdapter, ManualEftAdapter],
  exports: [PaymentGatewayService],
})
export class PaymentGatewayModule {}
