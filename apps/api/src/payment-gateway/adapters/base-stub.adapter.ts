import {
  GatewayStatus,
  InitiatePaymentRequest,
  InitiatePaymentResult,
  PaymentGatewayAdapter,
  VerifyPaymentRequest,
  VerifyPaymentResult,
} from "./payment-gateway-adapter.interface";

/**
 * Shared "not wired up yet" behavior for every adapter until real merchant
 * credentials exist (see the interface file for why). Subclasses only need
 * to declare gatewayKey, requiredEnvVars, and hostedCheckoutUrl — the actual
 * provider request-signing/redirect logic gets filled in per-provider once
 * credentials land, without changing the PaymentGatewayService contract.
 */
export abstract class BaseStubAdapter implements PaymentGatewayAdapter {
  abstract readonly gatewayKey: string;
  /** Env var names this provider will need once it's wired up for real. */
  protected abstract readonly requiredEnvVars: string[];
  /** Provider's hosted-checkout base URL — where the real integration will POST. */
  protected abstract readonly hostedCheckoutUrl: string;

  private missingEnvVars(): string[] {
    return this.requiredEnvVars.filter((name) => !process.env[name]);
  }

  /** For the admin routing page: are the credentials present, and is the integration built? */
  status(): GatewayStatus {
    const missing = this.missingEnvVars();
    return { live: false, configured: missing.length === 0, missingEnvVars: missing };
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    // Customer-facing: no configuration details. Staff see those on the admin routing page.
    return {
      isLive: false,
      note: `Online payment for this method isn't switched on yet, so order ${request.orderNumber} (R${request.amount.toFixed(2)}) hasn't been charged. Choose another method, or contact sales and we'll help you pay.`,
    };
  }

  async verify(_request: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    return {
      isValid: false,
      status: "UNKNOWN",
    };
  }
}
