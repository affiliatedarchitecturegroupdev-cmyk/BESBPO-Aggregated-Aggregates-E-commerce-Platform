/**
 * Sales quotations (docs/sales-quotes.md): how each line is priced and how
 * the quotation adds up. Pure, so it's unit-tested without a database.
 *
 * Every price is VAT inclusive, like the storefront. A line takes, in order:
 * 1. the price staff type in (MANUAL);
 * 2. the supplier's cost plus a markup (SUPPLIER_COST) — the product's own
 *    standard markup unless staff change it;
 * 3. the platform's list price at the client's tier (LIST).
 */
import { VAT_RATE_PERCENT as VAT_PERCENT } from "../tax/tax";
export const DEFAULT_VALID_DAYS = 14;
/** When the pricing service doesn't say (it always should): the storefront markup (PRICING_POLICY.md). */
export const FALLBACK_MARKUP_PERCENT = 8;

export type PriceSource = "LIST" | "SUPPLIER_COST" | "MANUAL";

export type LineInput = { unitPrice?: number | null; unitCost?: number | null; markupPercent?: number | null };
export type LineReference = { listUnitPrice: number | null; listUnitCost: number | null; standardMarkupPercent: number | null };
export type PricedQuoteLine = { unitPrice: number; unitCost: number | null; markupPercent: number | null; priceSource: PriceSource };

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const given = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v);

/** A line's price, or null when nothing prices it yet (no list price, and staff gave neither a price nor a cost). */
export function priceQuoteLine(input: LineInput, ref: LineReference): PricedQuoteLine | null {
  const markup = given(input.markupPercent) ? input.markupPercent : (ref.standardMarkupPercent ?? FALLBACK_MARKUP_PERCENT);
  if (given(input.unitPrice)) {
    const cost = given(input.unitCost) ? input.unitCost : ref.listUnitCost;
    return { unitPrice: round2(input.unitPrice), unitCost: cost ?? null, markupPercent: cost ? round2((input.unitPrice / cost - 1) * 100) : null, priceSource: "MANUAL" };
  }
  if (given(input.unitCost)) {
    return { unitPrice: round2(input.unitCost * (1 + markup / 100)), unitCost: round2(input.unitCost), markupPercent: round2(markup), priceSource: "SUPPLIER_COST" };
  }
  if (ref.listUnitPrice !== null) {
    return {
      unitPrice: round2(ref.listUnitPrice),
      unitCost: ref.listUnitCost,
      markupPercent: ref.listUnitCost ? round2((ref.listUnitPrice / ref.listUnitCost - 1) * 100) : null,
      priceSource: "LIST",
    };
  }
  return null;
}

/** The quotation's totals; cost and margin are for staff only. */
export function quoteTotals(lines: { quantity: number; unitPrice: number; unitCost: number | null }[], deliveryFee: number) {
  const subtotal = round2(lines.reduce((t, l) => t + round2(l.unitPrice * l.quantity), 0));
  const total = round2(subtotal + deliveryFee);
  const vat = round2((total * VAT_PERCENT) / (100 + VAT_PERCENT));
  const costed = lines.every((l) => l.unitCost !== null);
  const cost = costed ? round2(lines.reduce((t, l) => t + round2((l.unitCost ?? 0) * l.quantity), 0)) : null;
  const margin = cost !== null ? round2(subtotal - cost) : null;
  return { subtotal, deliveryFee: round2(deliveryFee), total, vat, exVat: round2(total - vat), cost, margin, marginPercent: cost && subtotal ? round2((margin! / subtotal) * 100) : null };
}

/** AAQ-000001 */
export const quotationNumber = (n: bigint | number) => `AAQ-${n.toString().padStart(6, "0")}`;
