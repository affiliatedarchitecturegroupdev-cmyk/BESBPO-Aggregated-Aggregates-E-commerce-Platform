import "server-only";
import { apiCached } from "@/lib/api";

/**
 * Whether the business is VAT-registered (ROADMAP 0.10, docs/vat.md), from the API — the one switch is
 * GROUP_VAT_NUMBER on the API. Until it is set, every customer-facing label is VAT-neutral; when the API can't be
 * reached the answer is "not registered", so the store never shows VAT it may not charge.
 */
export async function getVatRegistered(): Promise<boolean> {
  const mode = await apiCached<{ vatRegistered?: boolean }>("/tax", 300, ["tax"]);
  return mode?.vatRegistered === true;
}
