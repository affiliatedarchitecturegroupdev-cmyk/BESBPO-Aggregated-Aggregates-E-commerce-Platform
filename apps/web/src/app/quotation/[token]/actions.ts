"use server";

import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export type QuotationAnswer = { error?: string; declined?: boolean } | null;

/** The client accepts: the order is made at the quoted prices and they go straight to pay. */
export async function acceptQuotation(_: QuotationAnswer, form: FormData): Promise<QuotationAnswer> {
  const token = String(form.get("token") ?? "");
  const result = await api<{ payUrl: string }>(`/quotations/view/${encodeURIComponent(token)}/accept`, { method: "POST" });
  if (!result.ok) return { error: result.message };
  // The pay page lives on this site: go there by its path.
  redirect(new URL(result.data.payUrl).pathname);
}

export async function declineQuotation(_: QuotationAnswer, form: FormData): Promise<QuotationAnswer> {
  const token = String(form.get("token") ?? "");
  const result = await api(`/quotations/view/${encodeURIComponent(token)}/decline`, { method: "POST" });
  return result.ok ? { declined: true } : { error: result.message };
}
