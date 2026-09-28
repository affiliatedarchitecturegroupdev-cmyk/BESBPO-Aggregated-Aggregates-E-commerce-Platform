import { QuoteReasonCode } from "@aggregates/database";
import type { QuoteOnlyReasonCode } from "../pricing/pricing.service";

/** Classifies a quote request from the pricing service's quote-only reason codes. */
export function quoteReasonCode(codes: QuoteOnlyReasonCode[]): QuoteReasonCode {
  const volume = codes.includes("VOLUME_THRESHOLD");
  const distance = codes.includes("OVER_MAX_DISTANCE");
  if (volume && distance) return QuoteReasonCode.BOTH;
  if (volume) return QuoteReasonCode.VOLUME_CIVIL_BULK;
  if (distance) return QuoteReasonCode.DELIVERY_OVER_100KM;
  if (codes.includes("PRICE_ON_REQUEST") || codes.includes("PACKAGED_BULK_DELIVERY")) return QuoteReasonCode.PRICE_ON_REQUEST;
  if (codes.length > 0) return QuoteReasonCode.DELIVERY_NOT_PRICED;
  return QuoteReasonCode.CUSTOMER_REQUEST;
}

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I to read out over the phone

/** Human-friendly quote reference, e.g. AAQ-260926-7K3F. */
export function quoteReference(now = new Date(), random = Math.random): string {
  const date = now.toISOString().slice(2, 10).replace(/-/g, "");
  const suffix = Array.from({ length: 4 }, () => REFERENCE_ALPHABET[Math.floor(random() * REFERENCE_ALPHABET.length)]).join("");
  return `AAQ-${date}-${suffix}`;
}
