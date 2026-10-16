import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Resend delivery webhooks (docs/email.md). Resend signs them the Svix way:
 * HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${raw body}`, keyed with the
 * base64 part of the endpoint's `whsec_…` signing secret, sent as one or more
 * space-separated `v1,<base64>` signatures.
 */
const TOLERANCE_SECONDS = 5 * 60;

export function verifyResendSignature(
  rawBody: Buffer | string | undefined,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret: string,
  now = Date.now(),
): boolean {
  if (!rawBody || !headers.id || !headers.timestamp || !headers.signature || !secret) return false;
  const timestamp = Number(headers.timestamp);
  if (!Number.isFinite(timestamp) || Math.abs(now / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key)
    .update(`${headers.id}.${headers.timestamp}.${Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : rawBody}`)
    .digest();
  return headers.signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    if (version !== "v1" || !value) return false;
    const given = Buffer.from(value, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

export type DeliveryStatus = "DELIVERED" | "DELAYED" | "BOUNCED" | "COMPLAINED";

/** Later, worse news wins: a complaint after delivery is kept, a late "delivered" never hides a bounce. */
export const DELIVERY_RANK: Record<DeliveryStatus, number> = { DELAYED: 1, DELIVERED: 2, BOUNCED: 3, COMPLAINED: 4 };

export type ResendEvent = {
  status: DeliveryStatus;
  messageId: string;
  recipients: string[];
  /** Only for a hard bounce or a spam complaint — the address must not be emailed again. */
  suppress: boolean;
  detail: string | null;
};

const TYPES: Record<string, DeliveryStatus> = {
  "email.delivered": "DELIVERED",
  "email.delivery_delayed": "DELAYED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
};

/** The parts of a webhook we act on, or null for events we don't track (sent, opened, clicked…). */
export function parseResendEvent(payload: unknown): ResendEvent | null {
  const p = payload as { type?: unknown; data?: { email_id?: unknown; to?: unknown; bounce?: { type?: unknown; subType?: unknown; message?: unknown } } } | null;
  const status = typeof p?.type === "string" ? TYPES[p.type] : undefined;
  const messageId = typeof p?.data?.email_id === "string" ? p.data.email_id : null;
  if (!status || !messageId) return null;
  const to = p!.data!.to;
  const recipients = (Array.isArray(to) ? to : [to]).filter((r): r is string => typeof r === "string").map((r) => r.trim().toLowerCase());
  const bounce = p!.data!.bounce;
  // Resend marks a soft bounce "Transient"; only a permanent bounce (or no type given) suppresses the address.
  const transient = typeof bounce?.type === "string" && /transient/i.test(bounce.type);
  const detail =
    status === "BOUNCED"
      ? [bounce?.type, bounce?.subType, bounce?.message].filter((x): x is string => typeof x === "string" && x.length > 0).join(" — ").slice(0, 300) || null
      : null;
  return { status, messageId, recipients, suppress: status === "COMPLAINED" || (status === "BOUNCED" && !transient), detail };
}
