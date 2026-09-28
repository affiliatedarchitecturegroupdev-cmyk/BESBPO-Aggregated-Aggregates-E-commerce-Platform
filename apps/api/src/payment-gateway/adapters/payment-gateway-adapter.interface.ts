/**
 * The "smart compromise" payment architecture (confirmed in the design
 * discussion — see AGENTIC_RULES.md): every PaymentMethodKey renders as its
 * own standout branded tile in the storefront, but under the hood a small
 * number of real merchant integrations (gateways) actually process the
 * transaction. This interface is the seam between the two — one adapter per
 * PaymentGateway enum value, so PaymentGatewayService never needs to know
 * which methods share a gateway.
 *
 * NONE of these adapters call a real provider yet. Doing so needs live
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
  /** Order.orderNumber — shown to the customer/provider as a merchant reference. */
  orderNumber: string;
  /** Rand amount, already computed by the pricing engine — never recomputed here. */
  amount: number;
  /** PaymentMethodKey (e.g. "CARD", "OZOW", "LULAPAY") — the tile the customer picked. */
  methodKey: string;
  customerEmail: string;
  /** Where the provider should send the customer back after paying. */
  returnUrl: string;
  /** Server-to-server callback URL for async payment confirmation (ITN/webhook). */
  notifyUrl: string;
};

export type InitiatePaymentResult = {
  /** true once a provider is actually wired up; false for every adapter today. */
  isLive: boolean;
  /** URL to redirect the customer to (hosted checkout) or a payment-link URL for WhatsApp Commerce. */
  redirectUrl?: string;
  /** Provider-side reference, once a real integration returns one. */
  providerReference?: string;
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

export type GatewayStatus = { live: boolean; configured: boolean; missingEnvVars: string[] };

export interface PaymentGatewayAdapter {
  /** Matches the PaymentGateway enum value this adapter implements. */
  readonly gatewayKey: string;

  status(): GatewayStatus;

  initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult>;

  verify(request: VerifyPaymentRequest): Promise<VerifyPaymentResult>;
}
