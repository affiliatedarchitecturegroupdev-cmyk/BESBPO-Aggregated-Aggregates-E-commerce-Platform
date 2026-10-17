import { Injectable } from "@nestjs/common";
import { missingStitchEnv, StitchClient, stitchConfig } from "../stitch/stitch";
import type { GatewayStatus, InitiatePaymentRequest, InitiatePaymentResult, PaymentGatewayAdapter, ProviderPaymentStatus, VerifyPaymentRequest, VerifyPaymentResult } from "./payment-gateway-adapter.interface";

/**
 * Stitch — pay by bank (docs/payments.md): the main route for the Stitch tile
 * and the fallback for Instant EFT and Zapper. No card limits, so it suits
 * large orders and deposits. Confirmed by a status check with Stitch after
 * its webhook or the customer's return (PaymentsService).
 */
@Injectable()
export class StitchAdapter implements PaymentGatewayAdapter {
  readonly gatewayKey = "STITCH_DIRECT";
  private client: { key: string; value: StitchClient } | null = null;

  private stitch(): StitchClient | null {
    const config = stitchConfig();
    if (!config) return null;
    if (this.client?.key !== config.clientId) this.client = { key: config.clientId, value: new StitchClient(config) };
    return this.client.value;
  }

  status(): GatewayStatus {
    const missing = missingStitchEnv();
    return { live: missing.length === 0, configured: missing.length === 0, missingEnvVars: [...missing] };
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const stitch = this.stitch();
    if (!stitch) {
      return { isLive: false, note: `Pay by bank isn't switched on yet, so order ${request.orderNumber} hasn't been charged. Choose another method, or contact sales and we'll help you pay.` };
    }
    const created = await stitch.createPaymentRequest({ paymentId: request.paymentId, orderNumber: request.orderNumber, amount: request.amount, returnUrl: request.returnUrl });
    return { isLive: true, redirectUrl: created.redirectUrl, providerCheckoutId: created.requestId, note: "Taking you to Stitch to pay from your bank…" };
  }

  async checkStatus(providerCheckoutId: string): Promise<ProviderPaymentStatus> {
    const stitch = this.stitch();
    if (!stitch) return { status: "PENDING", detail: "Stitch isn't configured." };
    return stitch.status(providerCheckoutId);
  }

  async verify(_request: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    return { isValid: false, status: "UNKNOWN" };
  }
}
