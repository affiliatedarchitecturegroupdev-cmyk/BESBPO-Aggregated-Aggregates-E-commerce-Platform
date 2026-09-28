import { Injectable } from "@nestjs/common";
import { BaseStubAdapter } from "./base-stub.adapter";

/**
 * Lulapay — direct integration for the LULAPAY tile. Trade/Volume-tier-only
 * B2B credit facility (see PaymentMethodConfig.tradeOnly and the confirmed
 * min/max order values) — never offered to Retail-tier customers.
 */
@Injectable()
export class LulapayAdapter extends BaseStubAdapter {
  readonly gatewayKey = "LULAPAY_DIRECT";
  protected readonly requiredEnvVars = ["LULAPAY_API_KEY", "LULAPAY_MERCHANT_ID"];
  protected readonly hostedCheckoutUrl = "https://business.lulapay.co.za/api/v1/credit-applications";
}
