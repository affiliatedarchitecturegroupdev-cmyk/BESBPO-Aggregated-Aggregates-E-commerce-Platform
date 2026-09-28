import { Injectable } from "@nestjs/common";
import { BaseStubAdapter } from "./base-stub.adapter";

/** Ozow — direct integration for the OZOW tile (its own instant-EFT rail). */
@Injectable()
export class OzowAdapter extends BaseStubAdapter {
  readonly gatewayKey = "OZOW_DIRECT";
  protected readonly requiredEnvVars = ["OZOW_SITE_CODE", "OZOW_PRIVATE_KEY", "OZOW_API_KEY"];
  protected readonly hostedCheckoutUrl = "https://pay.ozow.com";
}
