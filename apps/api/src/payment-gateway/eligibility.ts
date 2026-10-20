import type { PaymentMethodConfig } from "@aggregates/database";
import type { CustomerTierName } from "../pricing/pricing.service";

export type EligibilityInput = {
  orderTotal: number;
  customerTier: CustomerTierName;
  /** Quote-only (RFQ) orders are invoiced: EFT / Purchase Order only. */
  isQuoteOnly: boolean;
  /** AA 60/120 orders must be paid there and then: Card, or a method PayFast processes. */
  isExpress?: boolean;
  /** The buyer's company has trade credit covering this amount (docs/trade-credit.md) — the only way ON_ACCOUNT shows. */
  onAccount?: boolean;
  /** Stitch is live (not test keys): pay by bank is suggested first on large amounts (BANK_FIRST_FROM). */
  bankFirst?: boolean;
};

/** SiteContent key for the PayFast checkout switch (open to customers unless an admin sets it to staff only). */
export const PAYFAST_VISIBILITY_KEY = "payfast-checkout";

export type EligibilityResult<T> = { recommended: T[]; available: T[] };

type Config = Pick<PaymentMethodConfig, "methodKey" | "isEnabled" | "tradeOnly" | "minOrderValue" | "maxOrderValue"> & Partial<Pick<PaymentMethodConfig, "activeGateway">>;

/** Paid later, away from checkout (SCode: cash at a retailer) — too slow for a 120-minute promise. */
const DEFERRED_METHODS = ["EFT_PO", "SCODE"];

/** Card, or anything PayFast processes that's paid on the spot — never an invoice or a pay-in-store code. */
export function isExpressMethod(method: Config): boolean {
  return method.methodKey === "CARD" || (method.activeGateway === "PAYFAST" && !DEFERRED_METHODS.includes(method.methodKey));
}

/** Lowest-fee rails first — shown as "recommended" on the tiles. */
export const RECOMMENDED_METHODS = ["INSTANT_EFT", "CAPITEC_PAY", "CARD"];

/**
 * From this amount, pay by bank through Stitch is the first recommended tile:
 * bank payments have no card limit (owner, 20 Oct 2026; docs/payments-stitch.md).
 */
export const BANK_FIRST_FROM = 30_000;

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
    if (input.isExpress && !isExpressMethod(method)) return false;
    if (method.methodKey === "ON_ACCOUNT" && !input.onAccount) return false;
    return true;
  });
  const bankFirst = Boolean(input.bankFirst) && input.orderTotal >= BANK_FIRST_FROM && eligible.some((m) => m.methodKey === "STITCH");
  const isRecommended = (m: T) => RECOMMENDED_METHODS.includes(m.methodKey) || (bankFirst && m.methodKey === "STITCH");
  const recommended = eligible.filter(isRecommended);
  if (bankFirst) recommended.sort((a, b) => Number(b.methodKey === "STITCH") - Number(a.methodKey === "STITCH"));
  return { recommended, available: eligible.filter((m) => !isRecommended(m)) };
}

export function isMethodEligible(configs: Config[], methodKey: string, input: EligibilityInput): boolean {
  const { recommended, available } = eligiblePaymentMethods(configs, input);
  return [...recommended, ...available].some((m) => m.methodKey === methodKey);
}
