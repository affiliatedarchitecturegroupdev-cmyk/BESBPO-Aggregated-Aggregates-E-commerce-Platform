import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Svix webhook signatures — used by Resend and Stitch. HMAC-SHA256 over
 * `${svix-id}.${svix-timestamp}.${raw body}`, keyed with the base64 part of
 * the endpoint's `whsec_…` signing secret, sent as one or more
 * space-separated `v1,<base64>` signatures; 5 minutes' tolerance.
 */
const TOLERANCE_SECONDS = 5 * 60;

export function verifySvixSignature(
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

