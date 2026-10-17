import { verifySvixSignature } from "../common/svix";

/**
 * Resend delivery webhooks (docs/email.md). Resend signs them the Svix way:
 * HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${raw body}`, keyed with the
 * base64 part of the endpoint's `whsec_…` signing secret, sent as one or more
 * space-separated `v1,<base64>` signatures.
 */
/** Resend signs with the Svix scheme (common/svix.ts). */
export const verifyResendSignature = verifySvixSignature;

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
