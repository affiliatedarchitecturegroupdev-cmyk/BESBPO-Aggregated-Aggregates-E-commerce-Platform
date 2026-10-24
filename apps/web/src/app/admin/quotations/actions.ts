"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { PricedQuotation, QuotationInput, QuoteUnit, SalesQuotation } from "@/lib/quotations";
import { sessionToken } from "@/lib/session";

/** Staff: products to quote (docs/sales-quotes.md). */
export async function searchQuoteProducts(q: string): Promise<{ sku: string; name: string; category: string; isActive: boolean; units: QuoteUnit[] }[]> {
  if (q.trim().length < 2) return [];
  const result = await api<{ sku: string; name: string; category: string; isActive: boolean; units: QuoteUnit[] }[]>(`/quotations/products?q=${encodeURIComponent(q.trim().slice(0, 80))}`, { token: sessionToken() });
  return result.ok ? result.data : [];
}

export async function priceQuotation(input: Pick<QuotationInput, "tier" | "deliveryDistanceKm" | "lines"> & { deliveryFee: number | null; province?: string }) {
  const result = await api<PricedQuotation>("/quotations/price", {
    method: "POST",
    token: sessionToken(),
    body: { tier: input.tier, deliveryDistanceKm: input.deliveryDistanceKm, lines: input.lines, ...(input.province ? { province: input.province } : {}) },
  });
  return result.ok ? { ok: true as const, pricing: result.data } : { ok: false as const, error: result.message };
}

export async function saveQuotation(id: string | null, input: QuotationInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const result = await api<SalesQuotation>(id ? `/quotations/${encodeURIComponent(id)}` : "/quotations", { method: id ? "PUT" : "POST", token: sessionToken(), body: input });
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/admin/quotations");
  revalidatePath(`/admin/quotations/${result.data.id}`);
  return { ok: true, id: result.data.id };
}

export type IssueResult = { ok: true; quoteNumber: string; url: string; whatsappUrl: string; whatsappText: string; emailedTo: string | null } | { ok: false; error: string };

export async function issueQuotation(id: string, email: boolean): Promise<IssueResult> {
  const result = await api<Omit<Extract<IssueResult, { ok: true }>, "ok">>(`/quotations/${encodeURIComponent(id)}/issue`, { method: "POST", token: sessionToken(), body: { email } });
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath(`/admin/quotations/${id}`);
  revalidatePath("/admin/quotations");
  return { ok: true, ...result.data };
}

export async function duplicateQuotation(form: FormData) {
  const id = String(form.get("id") ?? "");
  const result = await api<SalesQuotation>(`/quotations/${encodeURIComponent(id)}/duplicate`, { method: "POST", token: sessionToken() });
  if (result.ok) redirect(`/admin/quotations/${result.data.id}`);
}
