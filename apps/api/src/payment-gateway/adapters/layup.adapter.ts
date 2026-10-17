import { Injectable } from "@nestjs/common";
import { LayupClient, layupConfig, missingLayupEnv } from "../layup/layup";
import type { GatewayStatus, InitiatePaymentRequest, InitiatePaymentResult, PaymentGatewayAdapter, ProviderPaymentStatus, VerifyPaymentRequest, VerifyPaymentResult } from "./payment-gateway-adapter.interface";

/**
 * LayUp — lay-by (docs/payments.md). The customer sets up a plan on LayUp's
 * page; the order is held until it's paid in full, then confirmed and
 * delivered. Progress is checked with LayUp hourly and on the customer's
 * return (PaymentsService.syncLayby).
 */
@Injectable()
export class LayupAdapter implements PaymentGatewayAdapter {
  readonly gatewayKey = "LAYUP";

  private layup(): LayupClient | null {
    const config = layupConfig();
    return config ? new LayupClient(config) : null;
  }

  status(): GatewayStatus {
    const missing = missingLayupEnv();
    return { live: missing.length === 0, configured: missing.length === 0, missingEnvVars: [...missing], mode: layupConfig()?.mode };
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const layup = this.layup();
    if (!layup) {
      return { isLive: false, note: `Lay-by isn't switched on yet, so nothing has been set up for order ${request.orderNumber}. Choose another way to pay, or contact sales.` };
    }
    const created = await layup.createOrder({ paymentId: request.paymentId, orderNumber: request.orderNumber, amount: request.amount, lines: request.lines ?? [] });
    return { isLive: true, redirectUrl: created.redirectUrl, providerCheckoutId: created.layupOrderId, note: "Taking you to LayUp to set up your lay-by plan…" };
  }

  async checkStatus(providerCheckoutId: string, amount: number): Promise<ProviderPaymentStatus> {
    const layup = this.layup();
    if (!layup) return { status: "PENDING", detail: "LayUp isn't configured." };
    return layup.status(providerCheckoutId, amount);
  }

  async verify(_request: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    return { isValid: false, status: "UNKNOWN" };
  }
}
