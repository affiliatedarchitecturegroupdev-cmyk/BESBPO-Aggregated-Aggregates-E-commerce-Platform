import { Injectable } from "@nestjs/common";
import { BaseStubAdapter } from "./base-stub.adapter";

/**
 * PayFast — routes CARD, INSTANT_EFT, CAPITEC_PAY, APPLE_PAY, GOOGLE_PAY,
 * SAMSUNG_PAY, SNAPSCAN, ZAPPER, PAYFLEX, MOBICRED, and MORETYME by default
 * (see the seed data in PaymentMethodConfig — PayFast's own onboarding
 * documentation lists all of these as available payment methods on a single
 * merchant account, which is why the routing table concentrates them here).
 */
@Injectable()
export class PayFastAdapter extends BaseStubAdapter {
  readonly gatewayKey = "PAYFAST";
  protected readonly requiredEnvVars = ["PAYFAST_MERCHANT_ID", "PAYFAST_MERCHANT_KEY", "PAYFAST_PASSPHRASE"];
  protected readonly hostedCheckoutUrl = "https://www.payfast.co.za/eng/process";
}
