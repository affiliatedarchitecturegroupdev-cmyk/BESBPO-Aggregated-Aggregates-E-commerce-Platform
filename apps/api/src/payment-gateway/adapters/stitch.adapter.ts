import { Injectable } from "@nestjs/common";
import { siteUrl } from "../../notifications/notification-templates";
import { missingStitchEnv, payerName, StitchClient, stitchConfig } from "../stitch/stitch";
import type { GatewayStatus, InitiatePaymentRequest, InitiatePaymentResult, PaymentGatewayAdapter, ProviderPaymentStatus, VerifyPaymentRequest, VerifyPaymentResult } from "./payment-gateway-adapter.interface";

/** How long a Stitch payment link stays payable — matches the ledger's 48-hour abandon window. */
const LINK_HOURS = 48;

/** The one page Stitch sends customers back to (registered with Stitch); it finds the payment and shows the outcome. */
export const stitchReturnUrl = () => `${siteUrl()}/payments/return`;

/**
 * Stitch Express (docs/payments-stitch.md): the main route for the Stitch
 * tile and a fallback for Instant EFT and Zapper — pay by bank has no card
 * limit, so it suits large orders and deposits. Can also back up card,
 * Capitec Pay and wallets, restricted to those methods on Stitch's page.
 * Confirmed by Stitch's webhook or a status check (PaymentsService), never by
 * the customer's return.
 */
@Injectable()
export class StitchAdapter implements PaymentGatewayAdapter {
  readonly gatewayKey = "STITCH_DIRECT";
  private client: { key: string; value: StitchClient } | null = null;

  /** The configured client, or null when the credentials aren't set. */
  stitch(): StitchClient | null {
    const config = stitchConfig();
    if (!config) return null;
    const key = `${config.clientId}:${config.clientSecret}`;
    if (this.client?.key !== key) this.client = { key, value: new StitchClient(config) };
    return this.client.value;
  }

  status(): GatewayStatus {
    const missing = missingStitchEnv();
    const config = stitchConfig();
    return { live: missing.length === 0, configured: missing.length === 0, missingEnvVars: [...missing], ...(config ? { mode: config.mode } : {}) };
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const stitch = this.stitch();
    if (!stitch) {
      return { isLive: false, note: `Stitch isn't switched on yet, so order ${request.orderNumber} hasn't been charged. Choose another method, or contact sales and we'll help you pay.` };
    }
    const created = await stitch.createPaymentLink({
      paymentId: request.paymentId,
      amount: request.amount,
      payerName: payerName(request.customerName, request.customerEmail),
      payerEmail: request.customerEmail || undefined,
      methodKey: request.methodKey,
      redirectUrl: `${stitchReturnUrl()}?ref=${encodeURIComponent(request.paymentId)}`,
      expiresAt: new Date(Date.now() + LINK_HOURS * 3_600_000),
    });
    return { isLive: true, redirectUrl: created.url, providerCheckoutId: created.linkId, note: "Taking you to Stitch to pay…" };
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
