import { GatewayError, type ProviderPaymentStatus } from "../adapters/payment-gateway-adapter.interface";

/**
 * Stitch — pay by bank (instant EFT straight from the customer's bank, no
 * card limits; docs/payments.md). A client-credentials token from
 * secure.stitch.money, then a payment initiation request over the GraphQL
 * API; the customer is sent to its URL and returns to ours. Stitch's webhook
 * (Svix-signed) prompts a status check over the API, which is the source of
 * truth. The money is paid into the beneficiary bank account set here.
 *
 * Env: STITCH_CLIENT_ID, STITCH_CLIENT_SECRET, STITCH_BENEFICIARY_NAME,
 * STITCH_BENEFICIARY_BANK (Stitch bank ID, e.g. "fnb", "absa",
 * "standard_bank", "nedbank", "capitec"), STITCH_BENEFICIARY_ACCOUNT, and
 * STITCH_WEBHOOK_SECRET for the webhook.
 */
export const STITCH_ENV = ["STITCH_CLIENT_ID", "STITCH_CLIENT_SECRET", "STITCH_BENEFICIARY_NAME", "STITCH_BENEFICIARY_BANK", "STITCH_BENEFICIARY_ACCOUNT"] as const;

const TOKEN_URL = "https://secure.stitch.money/connect/token";
const GRAPHQL_URL = "https://api.stitch.money/graphql";

export type StitchConfig = { clientId: string; clientSecret: string; beneficiary: { name: string; bankId: string; accountNumber: string } };

export const missingStitchEnv = () => STITCH_ENV.filter((name) => !process.env[name]?.trim());

export function stitchConfig(): StitchConfig | null {
  if (missingStitchEnv().length) return null;
  return {
    clientId: process.env.STITCH_CLIENT_ID!.trim(),
    clientSecret: process.env.STITCH_CLIENT_SECRET!.trim(),
    beneficiary: {
      name: process.env.STITCH_BENEFICIARY_NAME!.trim(),
      bankId: process.env.STITCH_BENEFICIARY_BANK!.trim().toLowerCase(),
      accountNumber: process.env.STITCH_BENEFICIARY_ACCOUNT!.replace(/\s/g, ""),
    },
  };
}

/** References show on bank statements: letters, digits and spaces only, and short. */
export function bankReference(value: string, max: number): string {
  return value.replace(/[^A-Za-z0-9 ]/g, "").slice(0, max).trim() || "AAGGREGATES";
}

const CREATE = `mutation CreatePaymentRequest($input: ClientPaymentInitiationRequestInput!) {
  clientPaymentInitiationRequestCreate(input: $input) {
    paymentInitiationRequest { id url }
  }
}`;

const STATUS = `query PaymentRequestStatus($id: ID!) {
  node(id: $id) {
    ... on PaymentInitiationRequest {
      id
      externalReference
      amount
      state {
        __typename
        ... on PaymentInitiationRequestCompleted { date amount }
        ... on PaymentInitiationRequestCancelled { date reason }
        ... on PaymentInitiationRequestExpired { date }
      }
    }
  }
}`;

/** Stitch amounts come back as a number or { quantity, currency }. */
export function stitchAmount(value: unknown): number | undefined {
  const raw = value && typeof value === "object" ? (value as { quantity?: unknown }).quantity : value;
  const n = Number(raw);
  return raw !== undefined && raw !== null && Number.isFinite(n) ? n : undefined;
}

export function classifyStitchState(typename: string | undefined): ProviderPaymentStatus["status"] {
  if (typename === "PaymentInitiationRequestCompleted") return "PAID";
  if (typename === "PaymentInitiationRequestCancelled" || typename === "PaymentInitiationRequestExpired") return "FAILED";
  return "PENDING";
}

/** The payment request a Stitch webhook is about (its shape varies by event; the status check decides the outcome). */
export function stitchWebhookRequestId(payload: unknown): string | null {
  const p = payload as { data?: { id?: unknown; paymentInitiationRequest?: { id?: unknown } }; id?: unknown } | null;
  const id = p?.data?.paymentInitiationRequest?.id ?? p?.data?.id ?? p?.id;
  return typeof id === "string" && id ? id : null;
}

export class StitchClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: StitchConfig) {}

  private async accessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt) return this.token.value;
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: "client_paymentrequest",
      audience: TOKEN_URL,
    });
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    }).catch((error: Error) => {
      throw new GatewayError(`Stitch token request failed: ${error.message}`);
    });
    const json = (await response.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
    if (!response.ok || !json.access_token) throw new GatewayError(`Stitch token request failed (HTTP ${response.status}).`);
    this.token = { value: json.access_token, expiresAt: Date.now() + Math.max((json.expires_in ?? 3600) - 60, 30) * 1000 };
    return json.access_token;
  }

  private async graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
    const token = await this.accessToken();
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20_000),
    }).catch((error: Error) => {
      throw new GatewayError(`Stitch unreachable: ${error.message}`);
    });
    const json = (await response.json().catch(() => ({}))) as { data?: T; errors?: { message: string }[] };
    if (!response.ok || json.errors?.length || !json.data) {
      throw new GatewayError(`Stitch API error (HTTP ${response.status}): ${json.errors?.map((e) => e.message).join("; ").slice(0, 300) ?? "no data"}`);
    }
    return json.data;
  }

  async createPaymentRequest(input: { paymentId: string; orderNumber: string; amount: number; returnUrl: string }) {
    const data = await this.graphql<{ clientPaymentInitiationRequestCreate: { paymentInitiationRequest: { id: string; url: string } } }>(CREATE, {
      input: {
        amount: { quantity: input.amount.toFixed(2), currency: "ZAR" },
        payerReference: bankReference(input.orderNumber, 12),
        beneficiaryReference: bankReference(input.orderNumber, 20),
        externalReference: input.paymentId,
        beneficiary: { bankAccount: { name: this.config.beneficiary.name, bankId: this.config.beneficiary.bankId, accountNumber: this.config.beneficiary.accountNumber } },
      },
    });
    const request = data.clientPaymentInitiationRequestCreate.paymentInitiationRequest;
    const separator = request.url.includes("?") ? "&" : "?";
    return { requestId: request.id, redirectUrl: `${request.url}${separator}redirect_uri=${encodeURIComponent(input.returnUrl)}` };
  }

  async status(requestId: string): Promise<ProviderPaymentStatus> {
    const data = await this.graphql<{ node: { id: string; amount?: unknown; state?: { __typename?: string; amount?: unknown; reason?: string } } | null }>(STATUS, { id: requestId });
    if (!data.node) return { status: "PENDING", detail: "Stitch doesn't know this payment request." };
    const state = data.node.state ?? {};
    return {
      status: classifyStitchState(state.__typename),
      providerReference: data.node.id,
      amount: stitchAmount(state.amount ?? data.node.amount),
      detail: [state.__typename, state.reason].filter(Boolean).join(" — ") || undefined,
    };
  }
}
