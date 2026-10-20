import { GatewayError, type ProviderPaymentStatus } from "../adapters/payment-gateway-adapter.interface";

/**
 * Stitch Express (docs/payments-stitch.md) — the REST API at
 * express.stitch.money, not Stitch's Enterprise GraphQL API. Each payment is
 * a payment link for the exact amount, tagged with our Payment ID as the
 * merchant reference. The customer pays on Stitch's hosted page (pay by bank,
 * and card, Capitec Pay or wallets where the account has them) and comes back
 * to a registered redirect URL. Stitch's `payment.paid` webhook (Svix-signed)
 * and the link's status from the API decide the outcome; expiry and
 * cancellation are only ever read from the API.
 *
 * Env: STITCH_CLIENT_ID and STITCH_CLIENT_SECRET (a `test-` client ID is test
 * mode), STITCH_WEBHOOK_SECRET for the webhook, and optionally STITCH_API_URL.
 */
export const STITCH_ENV = ["STITCH_CLIENT_ID", "STITCH_CLIENT_SECRET"] as const;

export type StitchConfig = { clientId: string; clientSecret: string; baseUrl: string; mode: "live" | "sandbox" };

export const missingStitchEnv = () => STITCH_ENV.filter((name) => !process.env[name]?.trim());

export function stitchConfig(): StitchConfig | null {
  if (missingStitchEnv().length) return null;
  const clientId = process.env.STITCH_CLIENT_ID!.trim();
  return {
    clientId,
    clientSecret: process.env.STITCH_CLIENT_SECRET!.trim(),
    baseUrl: (process.env.STITCH_API_URL?.trim() || "https://express.stitch.money").replace(/\/+$/, ""),
    mode: clientId.startsWith("test-") ? "sandbox" : "live",
  };
}

/** Rand to Stitch's cents. */
export const toCents = (rand: number) => Math.round(rand * 100);

/** Stitch's cents (a number, or a string on refunds) to rand. */
export function fromCents(value: unknown): number | undefined {
  const n = Number(value);
  return value !== undefined && value !== null && value !== "" && Number.isFinite(n) ? n / 100 : undefined;
}

/** The payer's name on the link: 3–40 characters. */
export function payerName(name: string | null | undefined, email: string): string {
  const candidate = (name?.trim() || email.split("@")[0] || "").replace(/\s+/g, " ").slice(0, 40).trim();
  return candidate.length >= 3 ? candidate : "Aggregated Aggregates customer";
}

/** Merchant references: letters, digits, spaces and hyphens, at most 50 characters. */
export function merchantReference(value: string): string {
  return value.replace(/[^A-Za-z0-9 -]/g, "").slice(0, 50).trim() || "AAGGREGATES";
}

/**
 * Which of Stitch's methods a tile offers. The Stitch tile, Instant EFT and
 * anything else get every method on the account (pay by bank included);
 * a lone wallet isn't allowed, so wallets come with card.
 */
export function allowedMethods(methodKey: string): string[] | undefined {
  switch (methodKey) {
    case "CARD":
      return ["CARD"];
    case "CAPITEC_PAY":
      return ["CAPITEC"];
    case "APPLE_PAY":
    case "GOOGLE_PAY":
    case "SAMSUNG_PAY":
      return ["CARD", "APPLE_PAY", "GOOGLE_PAY"];
    default:
      return undefined;
  }
}

/** A payment link's status: PAID settles the payment, EXPIRED and CANCELLED end it. */
export function classifyLinkStatus(status: string | undefined): ProviderPaymentStatus["status"] {
  if (status === "PAID") return "PAID";
  if (status === "EXPIRED" || status === "CANCELLED") return "FAILED";
  return "PENDING";
}

/** The payment link a `payment.paid` webhook is about. */
export function stitchWebhookLinkId(payload: unknown): string | null {
  const p = payload as { linkId?: unknown; type?: unknown } | null;
  return typeof p?.linkId === "string" && p.linkId ? p.linkId : null;
}

type Envelope<T> = { success?: boolean; data?: T; generalErrors?: string[]; fieldErrors?: Record<string, string[]>; code?: string };

export type StitchLink = { id: string; paymentId?: string | null; amount?: number; status?: string; link?: string; merchantReference?: string; paidAt?: string };

function describe<T>(json: Envelope<T>, status: number): string {
  const fields = Object.entries(json.fieldErrors ?? {}).map(([field, errors]) => `${field}: ${errors.join(", ")}`);
  const errors = [...(json.generalErrors ?? []), ...fields].join("; ");
  return `HTTP ${status}${json.code ? ` ${json.code}` : ""}${errors ? ` — ${errors.slice(0, 300)}` : ""}`;
}

export class StitchClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: StitchConfig) {}

  get mode() {
    return this.config.mode;
  }

  /** Tokens last 15 minutes; reuse one for 14. */
  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;
    const response = await fetch(`${this.config.baseUrl}/api/v1/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ clientId: this.config.clientId, clientSecret: this.config.clientSecret, scope: "client_paymentrequest" }),
      signal: AbortSignal.timeout(15_000),
    }).catch((error: Error) => {
      throw new GatewayError(`Stitch unreachable: ${error.message}`);
    });
    const json = (await response.json().catch(() => ({}))) as Envelope<{ accessToken?: string }>;
    if (!response.ok || !json.data?.accessToken) {
      const hint = response.status === 400 ? " Check STITCH_CLIENT_ID and STITCH_CLIENT_SECRET — viewing the secret in the Stitch dashboard replaces it." : "";
      throw new GatewayError(`Stitch token request failed (${describe(json, response.status)}).${hint}`);
    }
    this.token = { value: json.data.accessToken, expiresAt: Date.now() + 14 * 60_000 };
    return json.data.accessToken;
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const token = await this.accessToken();
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),
    }).catch((error: Error) => {
      throw new GatewayError(`Stitch unreachable: ${error.message}`);
    });
    if (response.status === 401) this.token = null;
    const json = (await response.json().catch(() => ({}))) as Envelope<T>;
    if (!response.ok || json.success === false || json.data === undefined) throw new GatewayError(`Stitch API error (${describe(json, response.status)}).`);
    return json.data;
  }

  /** A payment link for one payment. `redirectUrl` must be registered with Stitch. */
  async createPaymentLink(input: { paymentId: string; amount: number; payerName: string; payerEmail?: string; methodKey: string; redirectUrl: string; expiresAt: Date }) {
    const methods = allowedMethods(input.methodKey);
    const data = await this.call<{ payment: StitchLink }>("POST", "/api/v1/payment-links", {
      amount: toCents(input.amount),
      payerName: input.payerName,
      merchantReference: merchantReference(input.paymentId),
      expiresAt: input.expiresAt.toISOString(),
      ...(input.payerEmail ? { payerEmailAddress: input.payerEmail } : {}),
      skipCheckoutPage: true,
      ...(methods ? { allowedPaymentMethods: methods } : {}),
    });
    const link = data.payment;
    if (!link?.id || !link.link) throw new GatewayError("Stitch didn't return a payment link.");
    const separator = link.link.includes("?") ? "&" : "?";
    return { linkId: link.id, url: `${link.link}${separator}redirect_url=${encodeURIComponent(input.redirectUrl)}` };
  }

  async status(linkId: string): Promise<ProviderPaymentStatus> {
    const data = await this.call<{ payment: StitchLink }>("GET", `/api/v1/payment-links/${encodeURIComponent(linkId)}`);
    const link = data.payment;
    return {
      status: classifyLinkStatus(link?.status),
      providerReference: link?.paymentId ?? undefined,
      amount: fromCents(link?.amount),
      detail: link?.status ? `Stitch payment link ${link.status.toLowerCase()}` : undefined,
    };
  }

  /** Admin setup: the redirect URLs registered for the account (proves the credentials work). */
  async redirectUrls(): Promise<string[]> {
    return (await this.call<{ redirectUrls?: string[] }>("GET", "/api/v1/redirect-urls")).redirectUrls ?? [];
  }

  async registerRedirectUrl(url: string): Promise<string[]> {
    return (await this.call<{ redirectUrls?: string[] }>("POST", "/api/v1/redirect-urls", { redirectUrl: url })).redirectUrls ?? [];
  }

  /** Registers the webhook; Stitch returns its signing secret once. */
  async registerWebhook(url: string): Promise<string> {
    const data = await this.call<{ secret?: string }>("POST", "/api/v1/webhook", { url });
    if (!data.secret) throw new GatewayError("Stitch didn't return a webhook signing secret.");
    return data.secret;
  }
}
