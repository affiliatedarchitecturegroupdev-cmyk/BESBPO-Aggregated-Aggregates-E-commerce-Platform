/**
 * PayFast custom integration (docs/payments-payfast.md): signing the
 * checkout form, and the checks on a payment notification (ITN). Pure
 * functions — the adapter and the notification handler call these.
 *
 * Credentials come only from the API service's environment, prefixed AGG_
 * because the owner runs several stores on one Render account. They are
 * never logged, returned or stored.
 */
import { createHash } from "crypto";
import { promises as dns } from "dns";

export type PayFastMode = "live" | "sandbox";
export type PayFastConfig = { merchantId: string; merchantKey: string; passphrase: string; mode: PayFastMode; host: string };

export const PAYFAST_ENV = {
  merchantId: "AGG_PAYFAST_MERCHANT_ID",
  merchantKey: "AGG_PAYFAST_MERCHANT_KEY",
  passphrase: "AGG_PAYFAST_PASSPHRASE",
  mode: "AGG_PAYFAST_MODE",
} as const;

const HOSTS: Record<PayFastMode, string> = { live: "www.payfast.co.za", sandbox: "sandbox.payfast.co.za" };

/** "live" only when spelled exactly; anything else is the sandbox, so a typo can never take real money. */
export function payfastMode(env: NodeJS.ProcessEnv = process.env): PayFastMode {
  return (env[PAYFAST_ENV.mode] ?? "").trim().toLowerCase() === "live" ? "live" : "sandbox";
}

export function missingPayfastEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return [PAYFAST_ENV.merchantId, PAYFAST_ENV.merchantKey, PAYFAST_ENV.passphrase].filter((name) => !(env[name] ?? "").trim());
}

export function payfastConfig(env: NodeJS.ProcessEnv = process.env): PayFastConfig | null {
  if (missingPayfastEnv(env).length) return null;
  const mode = payfastMode(env);
  return {
    merchantId: env[PAYFAST_ENV.merchantId]!.trim(),
    merchantKey: env[PAYFAST_ENV.merchantKey]!.trim(),
    // The passphrase is used exactly as set on the PayFast dashboard — only surrounding whitespace is ignored.
    passphrase: env[PAYFAST_ENV.passphrase]!.trim(),
    mode,
    host: HOSTS[mode],
  };
}

/** PHP urlencode, which PayFast's signature is defined against: spaces as "+", and !'()* (left alone by encodeURIComponent) escaped too. */
export function pfEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, "+");
}

/**
 * "key=value&…" over the fields in their given order, without the signature.
 * For a checkout form PayFast leaves out empty values and trims; for a
 * notification it signs every field it sent, empty ones included, as sent.
 */
export function paramString(fields: [string, string][], kind: "checkout" | "notification" = "checkout"): string {
  return fields
    .filter(([key, value]) => key !== "signature" && (kind === "notification" || value !== ""))
    .map(([key, value]) => `${key}=${pfEncode(kind === "checkout" ? value.trim() : value)}`)
    .join("&");
}

/** MD5 of the parameter string with the passphrase appended — PayFast's signature. */
export function signature(fields: [string, string][], passphrase: string, kind: "checkout" | "notification" = "checkout"): string {
  const base = paramString(fields, kind);
  const withPassphrase = passphrase ? `${base}&passphrase=${pfEncode(passphrase.trim())}` : base;
  return createHash("md5").update(withPassphrase).digest("hex");
}

export type CheckoutInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
};

/**
 * The hidden form the shopper's browser posts to PayFast. Field order is
 * PayFast's documented order and is part of the signature. No
 * payment_method is sent, so PayFast offers every method enabled on the
 * merchant account.
 */
export function checkoutForm(config: PayFastConfig, input: CheckoutInput): { action: string; fields: [string, string][] } {
  const fields: [string, string][] = [
    ["merchant_id", config.merchantId],
    ["merchant_key", config.merchantKey],
    ["return_url", input.returnUrl],
    ["cancel_url", input.cancelUrl],
    ["notify_url", input.notifyUrl],
    ["email_address", input.customerEmail],
    ["m_payment_id", input.orderId],
    ["amount", input.amount.toFixed(2)],
    ["item_name", `Aggregated Aggregates order ${input.orderNumber}`.slice(0, 100)],
  ];
  return { action: `https://${config.host}/eng/process`, fields: [...fields, ["signature", signature(fields, config.passphrase)]] };
}

/** The notification's fields in the order PayFast sent them — the order matters for the signature. */
export function parseNotification(rawBody: string): [string, string][] {
  return [...new URLSearchParams(rawBody).entries()];
}

export function signatureMatches(fields: [string, string][], passphrase: string): boolean {
  const sent = fields.find(([key]) => key === "signature")?.[1] ?? "";
  return sent.length === 32 && sent.toLowerCase() === signature(fields, passphrase, "notification");
}

/**
 * PayFast's published notification source ranges. The host names are
 * resolved too, so a change on PayFast's side is still recognised.
 */
const PAYFAST_RANGES = ["197.97.145.144/28", "41.74.179.192/27", "102.216.36.0/28", "102.216.36.128/28", "144.126.193.139/32"];
const PAYFAST_HOSTS = ["www.payfast.co.za", "sandbox.payfast.co.za", "w1w.payfast.co.za", "w2w.payfast.co.za"];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

export function inRange(ip: string, cidr: string): boolean {
  const [base, bits] = cidr.split("/");
  const a = ipv4ToInt(ip);
  const b = ipv4ToInt(base);
  if (a === null || b === null) return false;
  const mask = Number(bits) === 0 ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (a & mask) === (b & mask);
}

/** The caller's address: Render puts the original client first in X-Forwarded-For. */
export function clientIp(forwardedFor: string | undefined, socketIp: string | undefined): string {
  const first = (forwardedFor ?? "").split(",")[0].trim();
  return (first || socketIp || "").replace(/^::ffff:/, "");
}

export async function isPayfastSource(ip: string): Promise<boolean> {
  if (PAYFAST_RANGES.some((range) => inRange(ip, range))) return true;
  const resolved = await Promise.all(PAYFAST_HOSTS.map((host) => dns.resolve4(host).catch(() => [] as string[])));
  return resolved.flat().includes(ip);
}

/** PayFast's server-side confirmation: post the notification back; PayFast answers "VALID" for one it really sent. */
export async function confirmWithPayfast(config: PayFastConfig, fields: [string, string][], fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(`https://${config.host}/eng/query/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: paramString(fields, "notification"),
      signal: AbortSignal.timeout(10_000),
    });
    return (await response.text()).trim() === "VALID";
  } catch {
    return false;
  }
}
