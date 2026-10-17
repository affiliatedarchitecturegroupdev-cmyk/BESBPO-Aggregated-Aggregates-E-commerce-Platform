import { Injectable } from "@nestjs/common";
import { missingPeachEnv, PeachClient, peachConfig } from "../peach/peach";
import type { GatewayStatus, InitiatePaymentRequest, InitiatePaymentResult, PaymentGatewayAdapter, ProviderPaymentStatus, VerifyPaymentRequest, VerifyPaymentResult } from "./payment-gateway-adapter.interface";

/**
 * Peach Payments — the second aggregator (docs/payments.md): the fallback for
 * cards, and the main route for PayJustNow, Happy Pay and Float. Hosted
 * Checkout V2: the customer pays on Peach's page; Peach's signed webhook and
 * a direct status check confirm it (PaymentsService).
 */
@Injectable()
export class PeachAdapter implements PaymentGatewayAdapter {
  readonly gatewayKey = "PEACH";
  private client: { key: string; value: PeachClient } | null = null;

  private peach(): PeachClient | null {
    const config = peachConfig();
    if (!config) return null;
    const key = `${config.clientId}:${config.mode}`;
    if (this.client?.key !== key) this.client = { key, value: new PeachClient(config) };
    return this.client.value;
  }

  status(): GatewayStatus {
    const missing = missingPeachEnv();
    return { live: missing.length === 0, configured: missing.length === 0, missingEnvVars: [...missing], mode: peachConfig()?.mode };
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const peach = this.peach();
    if (!peach) {
      return { isLive: false, note: `Online payment for this method isn't switched on yet, so order ${request.orderNumber} hasn't been charged. Choose another method, or contact sales and we'll help you pay.` };
    }
    const checkout = await peach.createCheckout({
      paymentId: request.paymentId,
      amount: request.amount,
      methodKey: request.methodKey,
      email: request.customerEmail,
      returnUrl: request.returnUrl,
      cancelUrl: request.cancelUrl,
      notifyUrl: request.notifyUrl,
    });
    return { isLive: true, redirectUrl: checkout.redirectUrl, providerCheckoutId: checkout.checkoutId, note: "Taking you to Peach Payments to pay securely…" };
  }

  async checkStatus(providerCheckoutId: string): Promise<ProviderPaymentStatus> {
    const peach = this.peach();
    if (!peach) return { status: "PENDING", detail: "Peach isn't configured." };
    return peach.status(providerCheckoutId);
  }

  async verify(_request: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    // Webhooks are verified in PaymentsService.peachWebhook.
    return { isValid: false, status: "UNKNOWN" };
  }
}
