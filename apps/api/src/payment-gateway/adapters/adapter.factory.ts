import { Injectable } from "@nestjs/common";
import { PaymentGateway } from "@aggregates/database";
import { PaymentGatewayAdapter } from "./payment-gateway-adapter.interface";
import { PayFastAdapter } from "./payfast.adapter";
import { PeachAdapter } from "./peach.adapter";
import { OzowAdapter } from "./ozow.adapter";
import { StitchAdapter } from "./stitch.adapter";
import { LulapayAdapter } from "./lulapay.adapter";
import { ManualEftAdapter } from "./manual-eft.adapter";

/**
 * Maps the PaymentGateway enum to a concrete adapter instance. This is the
 * one place that needs to change if a new gateway is ever added — everything
 * upstream (PaymentGatewayService, the storefront tiles) only ever talks to
 * the PaymentGatewayAdapter interface.
 */
@Injectable()
export class PaymentGatewayAdapterFactory {
  constructor(
    private readonly payfast: PayFastAdapter,
    private readonly peach: PeachAdapter,
    private readonly ozow: OzowAdapter,
    private readonly stitch: StitchAdapter,
    private readonly lulapay: LulapayAdapter,
    private readonly manualEft: ManualEftAdapter,
  ) {}

  get(gateway: PaymentGateway): PaymentGatewayAdapter {
    switch (gateway) {
      case "PAYFAST":
        return this.payfast;
      case "PEACH":
        return this.peach;
      case "OZOW_DIRECT":
        return this.ozow;
      case "STITCH_DIRECT":
        return this.stitch;
      case "LULAPAY_DIRECT":
        return this.lulapay;
      case "MANUAL_EFT":
        return this.manualEft;
      default: {
        const exhaustiveCheck: never = gateway;
        throw new Error(`No adapter registered for gateway: ${exhaustiveCheck}`);
      }
    }
  }
}
