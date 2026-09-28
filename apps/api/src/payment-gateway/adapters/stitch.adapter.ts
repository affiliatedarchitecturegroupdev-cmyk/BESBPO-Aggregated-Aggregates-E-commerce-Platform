import { Injectable } from "@nestjs/common";
import { BaseStubAdapter } from "./base-stub.adapter";

/** Stitch Payments — direct integration for the STITCH tile (Pay by Bank / instant EFT). */
@Injectable()
export class StitchAdapter extends BaseStubAdapter {
  readonly gatewayKey = "STITCH_DIRECT";
  protected readonly requiredEnvVars = ["STITCH_CLIENT_ID", "STITCH_CLIENT_SECRET"];
  protected readonly hostedCheckoutUrl = "https://pay.stitch.money";
}
