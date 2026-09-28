import type { PaymentMethodConfig } from "@aggregates/database";
import type { CustomerTierName } from "../pricing/pricing.service";

export type EligibilityInput = {
  orderTotal: number;
  customerTier: CustomerTierName;
  /** Quote-only (RFQ) orders are invoiced: EFT / Purchase Order only. */
  isQuoteOnly: boolean;
};

export type EligibilityResult<T> = { recommended: T[]; available: T[] };

type Config = Pick<PaymentMethodConfig, "methodKey" | "isEnabled" | "tradeOnly" | "minOrderValue" | "maxOrderValue">;

/** Lowest-fee rails first — shown as "recommended" on the tiles. */
export const RECOMMENDED_METHODS = ["INSTANT_EFT", "CAPITEC_PAY", "CARD"];

/**
 * Which payment tiles an order may use — the server-side source of truth.
 * The storefront renders from this, and PaymentGatewayService re-checks it
 * on every payment, so a tampered request can never pick an ineligible or
 * disabled method.
 */
export function eligiblePaymentMethods<T extends Config>(configs: T[], input: EligibilityInput): EligibilityResult<T> {
  const enabled = configs.filter((c) => c.isEnabled);
  if (input.isQuoteOnly) {
    return { recommended: [], available: enabled.filter((c) => c.methodKey === "EFT_PO") };
  }
  const eligible = enabled.filter((method) => {
    if (method.tradeOnly && input.customerTier === "RETAIL") return false;
    if (method.minOrderValue != null && input.orderTotal < Number(method.minOrderValue)) return false;
    if (method.maxOrderValue != null && input.orderTotal > Number(method.maxOrderValue)) return false;
    return true;
  });
  return {
    recommended: eligible.filter((m) => RECOMMENDED_METHODS.includes(m.methodKey)),
    available: eligible.filter((m) => !RECOMMENDED_METHODS.includes(m.methodKey)),
  };
}

export function isMethodEligible(configs: Config[], methodKey: string, input: EligibilityInput): boolean {
  const { recommended, available } = eligiblePaymentMethods(configs, input);
  return [...recommended, ...available].some((m) => m.methodKey === methodKey);
}
