import { Injectable } from "@nestjs/common";
import { bankingDetailLines, formatZAR, SELLER } from "../../common/format";
import type {
  GatewayStatus,
  InitiatePaymentRequest,
  InitiatePaymentResult,
  PaymentGatewayAdapter,
  VerifyPaymentRequest,
  VerifyPaymentResult,
} from "./payment-gateway-adapter.interface";

/**
 * Manual EFT / Purchase Order — the one route with no third-party provider,
 * so it is live today. Offered only to Trade/Volume accounts. The order
 * stays PENDING; finance reconciles the bank statement against the order
 * number and marks the invoice paid.
 */
@Injectable()
export class ManualEftAdapter implements PaymentGatewayAdapter {
  readonly gatewayKey = "MANUAL_EFT";

  status(): GatewayStatus {
    return { live: true, configured: true, missingEnvVars: [] };
  }

  async initiate(request: InitiatePaymentRequest): Promise<InitiatePaymentResult> {
    const bank = bankingDetailLines();
    const where = bank.length
      ? `Our bank account: ${bank.join(" · ")}.`
      : `Our team will send banking details on request (${SELLER.email}).`;
    return {
      isLive: true,
      note: `Pay ${formatZAR(request.amount)} by EFT, or send a purchase order, quoting ${request.orderNumber} as the reference. ${where} Finance confirms payment against that reference; the details are also on your order confirmation (PDF).`,
    };
  }

  async verify(_request: VerifyPaymentRequest): Promise<VerifyPaymentResult> {
    // Reconciled by finance against the bank statement, not by a webhook.
    return { isValid: true, status: "PENDING" };
  }
}
