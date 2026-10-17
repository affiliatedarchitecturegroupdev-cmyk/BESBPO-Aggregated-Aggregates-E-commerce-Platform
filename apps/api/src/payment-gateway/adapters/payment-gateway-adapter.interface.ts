/**
 * The "smart compromise" payment architecture (confirmed in the design
 * discussion — see AGENTIC_RULES.md): every PaymentMethodKey renders as its
 * own standout branded tile in the storefront, but under the hood a small
 * number of real merchant integrations (gateways) actually process the
 * transaction. This interface is the seam between the two — one adapter per
 * PaymentGateway enum value, so PaymentGatewayService never needs to know
 * which methods share a gateway.
 *
 * PayFast is wired up for real (docs/payments-payfast.md); the others below
 * are still structural stubs. Originally none of them called a provider. Doing so needs live
 * merchant credentials (PayFast merchant ID/key, Peach entity IDs, Ozow
 * site code, Stitch client ID, Lulapay API key) which have not been
 * supplied to this build. Each adapter is a faithful structural stub:
 * correct request/response shape, correct config surface (env var names),
 * and a clear runtime error if actually invoked before credentials exist.
 * Wiring real credentials and going live is launch work (AGENTIC_RULES.md
 * phase 5) — credentials are never invented here, matching rule 1 ("don't
 * invent pricing") applied to payment configuration.
 */

export type InitiatePaymentRequest = {
  /** Internal Order.id this payment is for. */
  orderId: string;
  /** Payment.id (the ledger row) — the merchant reference the gateway echoes back, so one order can take several payments. */
  paymentId: string;
  /** Order.orderNumber — shown to the customer/provider as a merchant reference. */
  orderNumber: string;
  /** Rand amount, already computed by the pricing engine — never recomputed here. */
  amount: number;
  /** PaymentMethodKey (e.g. "CARD", "OZOW", "LULAPAY") — the tile the customer picked. */
  methodKey: string;
  customerEmail: string;
  customerName?: string | null;
  /** The order's lines, for gateways that list them (LayUp's plan shows the products). */
  lines?: { sku: string; name: string; amount: number; link: string }[];
  /** Where the provider should send the customer back after paying. */
  returnUrl: string;
  /** Where the provider sends the customer if they cancel on its page. */
  cancelUrl: string;
  /** Server-to-server callback URL for async payment confirmation (ITN/webhook). */
  notifyUrl: string;
};

export type InitiatePaymentResult = {
  /** true once a provider is actually wired up; false for every adapter today. */
  isLive: boolean;
  /** URL to redirect the customer to (hosted checkout) or a payment-link URL for WhatsApp Commerce. */
  redirectUrl?: string;
  /** A hosted checkout that must be reached by a form POST (PayFast): the browser submits these fields, in order, to action. */
  form?: { action: string; fields: [string, string][] };
  /** Provider-side reference, once a real integration returns one. */
  providerReference?: string;
  /** The provider's ID for this checkout (Peach checkoutId, Stitch payment request ID, LayUp order ID) — used to check its status. */
  providerCheckoutId?: string;
  /** Explains why isLive is false, or nothing further is needed if it's true. */
  note: string;
};

export type VerifyPaymentRequest = {
  /** Raw callback payload from the provider (ITN body, webhook body, etc). */
  payload: Record<string, unknown>;
  /** Raw signature/hash header, where the provider sends one, for signature checks. */
  signatureHeader?: string;
};

export type VerifyPaymentResult = {
  isValid: boolean;
  orderId?: string;
  status: "PAID" | "FAILED" | "PENDING" | "UNKNOWN";
};

/** What a gateway says about one checkout, asked directly (never taken from a browser redirect). */
export type ProviderPaymentStatus = {
  status: "PAID" | "PENDING" | "FAILED";
  /** The gateway's payment/transaction ID. */
  providerReference?: string;
  /** Rand amount the gateway says was paid (checked against the ledger). */
  amount?: number;
  /** Lay-by: how much the customer has paid so far, before the plan completes. */
  paidSoFar?: number;
  detail?: string;
};

/** A gateway answered with an error (not "not configured") — counts towards tripping failover. */
export class GatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GatewayError";
  }
}

export type GatewayStatus = { live: boolean; configured: boolean; missingEnvVars: string[]; mode?: "live" | "sandbox" };

export interface PaymentGatewayAdapter {
  /** Matches the PaymentGateway enum value this adapter implements. */
  readonly gatewayKey: string;

  status(): GatewayStatus;

  initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult>;

  verify(request: VerifyPaymentRequest): Promise<VerifyPaymentResult>;

  /** Ask the gateway directly how a checkout stands (Peach, Stitch, LayUp). */
  checkStatus?(providerCheckoutId: string, amount: number): Promise<ProviderPaymentStatus>;
}
