import { Injectable } from "@nestjs/common";
import { checkoutForm, missingPayfastEnv, payfastConfig, payfastMode } from "../payfast/payfast";
import type { GatewayStatus, InitiatePaymentRequest, InitiatePaymentResult, PaymentGatewayAdapter, VerifyPaymentRequest, VerifyPaymentResult } from "./payment-gateway-adapter.interface";

/**
 * PayFast — routes CARD, INSTANT_EFT, CAPITEC_PAY, APPLE_PAY, GOOGLE_PAY,
 * SAMSUNG_PAY, SNAPSCAN, ZAPPER, SCODE, PAYFLEX, MOBICRED, and MORETYME by
 * default. Live once AGG_PAYFAST_MERCHANT_ID, _MERCHANT_KEY and _PASSPHRASE
 * are set on the API (AGG_PAYFAST_MODE = "live" or sandbox otherwise).
 *
 * The shopper's browser posts a signed form to PayFast's hosted page, where
 * they choose among the methods enabled on the merchant account. PayFast
 * then confirms the payment by a server-to-server notification (ITN),
 * handled in PaymentGatewayService.payfastNotification —
 * docs/payments-payfast.md.
 */
@Injectable()
export class PayFastAdapter implements PaymentGatewayAdapter {
  readonly gatewayKey = "PAYFAST";

  status(): GatewayStatus {
    const missing = missingPayfastEnv();
    return { live: missing.length === 0, configured: missing.length === 0, missingEnvVars: missing, mode: payfastMode() };
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const config = payfastConfig();
    if (!config) {
      return {
        isLive: false,
        note: `Online payment isn't switched on yet, so order ${request.orderNumber} hasn't been charged. Choose another method, or contact sales and we'll help you pay.`,
      };
    }
    return {
      isLive: true,
      form: checkoutForm(config, {
        orderId: request.orderId,
        orderNumber: request.orderNumber,
        amount: request.amount,
        customerEmail: request.customerEmail,
        returnUrl: request.returnUrl,
        cancelUrl: request.cancelUrl,
        notifyUrl: request.notifyUrl,
      }),
      note: "Taking you to PayFast to pay securely…",
    };
  }

  async verify(_request: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    // Notifications are verified in PaymentGatewayService.payfastNotification, which also updates the order.
    return { isValid: false, status: "UNKNOWN" };
  }
}
