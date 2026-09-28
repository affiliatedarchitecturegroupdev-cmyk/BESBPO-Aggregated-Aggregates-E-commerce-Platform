import { Injectable } from "@nestjs/common";
import { BaseStubAdapter } from "./base-stub.adapter";

/**
 * Peach Payments — the fallback/secondary aggregator, and the default
 * primary route for PAYJUSTNOW, HAPPY_PAY, and FLOAT (Peach's BNPL
 * partner network covers these where PayFast does not).
 */
@Injectable()
export class PeachAdapter extends BaseStubAdapter {
  readonly gatewayKey = "PEACH";
  protected readonly requiredEnvVars = ["PEACH_ENTITY_ID", "PEACH_AUTH_TOKEN"];
  protected readonly hostedCheckoutUrl = "https://eu-prod.oppwa.com/v1/checkouts";
}
