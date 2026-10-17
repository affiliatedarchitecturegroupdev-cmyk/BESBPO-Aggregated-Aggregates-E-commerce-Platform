import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { GatewayError, type ProviderPaymentStatus } from "../adapters/payment-gateway-adapter.interface";

/**
 * Peach Payments — Hosted Checkout V2 (docs/payments.md). Server-side only:
 * an OAuth token from the dashboard host, then POST /v2/checkout returns a
 * redirect URL to Peach's hosted page. Peach notifies the API by a signed
 * form-encoded webhook; the payment is then confirmed by asking Peach for the
 * checkout's status (GET /v2/checkout/{id}/status), never trusted from the
 * browser. Env: PEACH_CLIENT_ID, PEACH_CLIENT_SECRET, PEACH_MERCHANT_ID,
 * PEACH_ENTITY_ID, PEACH_SECRET_TOKEN, PEACH_MODE ("live", else sandbox).
 */
export const PEACH_ENV = ["PEACH_CLIENT_ID", "PEACH_CLIENT_SECRET", "PEACH_MERCHANT_ID", "PEACH_ENTITY_ID", "PEACH_SECRET_TOKEN"] as const;

const HOSTS = {
  sandbox: { auth: "https://sandbox-dashboard.peachpayments.com", checkout: "https://testsecure.peachpayments.com" },
  live: { auth: "https://dashboard.peachpayments.com", checkout: "https://secure.peachpayments.com" },
};

export type PeachConfig = { clientId: string; clientSecret: string; merchantId: string; entityId: string; secretToken: string; mode: "live" | "sandbox"; origin: string };

export const missingPeachEnv = () => PEACH_ENV.filter((name) => !process.env[name]?.trim());

export function peachConfig(): PeachConfig | null {
  if (missingPeachEnv().length) return null;
  return {
    clientId: process.env.PEACH_CLIENT_ID!.trim(),
    clientSecret: process.env.PEACH_CLIENT_SECRET!.trim(),
    merchantId: process.env.PEACH_MERCHANT_ID!.trim(),
    entityId: process.env.PEACH_ENTITY_ID!.trim(),
    secretToken: process.env.PEACH_SECRET_TOKEN!.trim(),
    mode: process.env.PEACH_MODE?.trim().toLowerCase() === "live" ? "live" : "sandbox",
    // Peach checks the Origin/Referer of /v2/checkout against the domains allowed on the account.
    origin: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aaggregates.store").replace(/\/+$/, ""),
  };
}

/**
 * The payment method Peach's page opens on, for the tile the customer picked
 * (they can still choose another there). Names per Peach's method list —
 * confirm against the methods switched on for the account.
 */
export const PEACH_METHOD: Record<string, string> = {
  CARD: "CARD",
  PAYJUSTNOW: "PAYJUSTNOW",
  HAPPY_PAY: "HAPPYPAY",
  FLOAT: "FLOAT",
  PAYFLEX: "PAYFLEX",
  MOBICRED: "MOBICRED",
  CAPITEC_PAY: "CAPITECPAY",
  INSTANT_EFT: "EFTSECURE",
  APPLE_PAY: "APPLE PAY",
  GOOGLE_PAY: "GOOGLE PAY",
};

/**
 * Peach/OPPWA result codes: 000.000.*, 000.100.1* and 000.3/000.6 succeed;
 * 000.400.0x (not 03x) and 000.400.100/110/120 succeed after review;
 * 000.200.* and 800.400.5 / 100.400.500 are still pending; anything else failed.
 */
export function classifyResultCode(code: string | undefined | null): ProviderPaymentStatus["status"] {
  if (!code) return "PENDING";
  if (/^(000\.000\.|000\.100\.1|000\.[36])/.test(code)) return "PAID";
  if (/^(000\.400\.0[0-24-9]|000\.400\.100|000\.400\.1[12]0)/.test(code)) return "PAID";
  if (/^(000\.200|800\.400\.5|100\.400\.500)/.test(code)) return "PENDING";
  return "FAILED";
}

/** Peach's "classic" signature: every other field sorted by name, `name` + `value` with no separators, HMAC-SHA256 hex. */
export function peachSignature(fields: [string, string][], secretToken: string): string {
  const message = [...fields]
    .filter(([k]) => k !== "signature")
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}${v}`)
    .join("");
  return createHmac("sha256", secretToken).update(message, "utf8").digest("hex");
}

/** A Peach webhook (form-encoded, signature inside the body): checked, then the fields we act on. */
export function parsePeachWebhook(rawBody: string, secretToken: string) {
  const params = new URLSearchParams(rawBody);
  const fields = [...params.entries()];
  const given = params.get("signature") ?? "";
  const expected = peachSignature(fields, secretToken);
  const valid = given.length === expected.length && given.length > 0 && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  return {
    valid,
    paymentId: params.get("merchantTransactionId") ?? "",
    checkoutId: params.get("checkoutId") ?? "",
    resultCode: params.get("result.code") ?? "",
    amount: params.get("amount") ? Number(params.get("amount")) : undefined,
    transactionId: params.get("id") ?? undefined,
    fields: Object.fromEntries(fields.filter(([k]) => k !== "signature")),
  };
}

export class PeachClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: PeachConfig) {}

  private hosts() {
    return HOSTS[this.config.mode];
  }

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;
    const response = await fetch(`${this.hosts().auth}/api/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ clientId: this.config.clientId, clientSecret: this.config.clientSecret, merchantId: this.config.merchantId }),
      signal: AbortSignal.timeout(15_000),
    }).catch((error: Error) => {
      throw new GatewayError(`Peach token request failed: ${error.message}`);
    });
    const json = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
    if (!response.ok || !json.access_token) throw new GatewayError(`Peach token request failed (HTTP ${response.status}).`);
    this.token = { value: json.access_token, expiresAt: Date.now() + Math.max((json.expires_in ?? 3600) - 60, 30) * 1000 };
    return json.access_token;
  }

  private async request(path: string, init: RequestInit) {
    const token = await this.accessToken();
    const response = await fetch(`${this.hosts().checkout}${path}`, {
      ...init,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, Origin: this.config.origin, Referer: `${this.config.origin}/`, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(20_000),
    }).catch((error: Error) => {
      throw new GatewayError(`Peach unreachable: ${error.message}`);
    });
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) throw new GatewayError(`Peach ${path.split("/").slice(0, 3).join("/")} failed (HTTP ${response.status}): ${JSON.stringify(json).slice(0, 300)}`);
    return json;
  }

  async createCheckout(input: { paymentId: string; amount: number; methodKey: string; email: string; returnUrl: string; cancelUrl: string; notifyUrl: string }) {
    const json = await this.request("/v2/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        authentication: { entityId: this.config.entityId },
        merchantTransactionId: input.paymentId,
        amount: input.amount.toFixed(2),
        currency: "ZAR",
        nonce: randomUUID(),
        paymentType: "DB",
        shopperResultUrl: input.returnUrl,
        cancelUrl: input.cancelUrl,
        notificationUrl: input.notifyUrl,
        customer: { email: input.email },
        ...(PEACH_METHOD[input.methodKey] ? { defaultPaymentMethod: PEACH_METHOD[input.methodKey] } : {}),
      }),
    });
    const checkoutId = typeof json.checkoutId === "string" ? json.checkoutId : "";
    const redirectUrl = typeof json.redirectUrl === "string" ? json.redirectUrl : "";
    if (!checkoutId || !redirectUrl) throw new GatewayError("Peach returned no checkout to send the customer to.");
    return { checkoutId, redirectUrl };
  }

  async status(checkoutId: string): Promise<ProviderPaymentStatus> {
    const json = await this.request(`/v2/checkout/${encodeURIComponent(checkoutId)}/status`, { method: "GET" });
    // The status endpoint answers flat ("result.code") or nested ({ result: { code } }); read both.
    const nested = (json.result ?? {}) as { code?: string; description?: string };
    const code = (json["result.code"] as string | undefined) ?? nested.code;
    const amount = json.amount !== undefined ? Number(json.amount) : undefined;
    return {
      status: classifyResultCode(code),
      providerReference: typeof json.id === "string" ? json.id : undefined,
      amount: Number.isFinite(amount) ? amount : undefined,
      detail: [code, (json["result.description"] as string | undefined) ?? nested.description].filter(Boolean).join(" — ") || undefined,
    };
  }
}
