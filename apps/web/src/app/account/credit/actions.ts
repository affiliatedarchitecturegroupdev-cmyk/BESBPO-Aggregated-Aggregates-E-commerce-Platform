"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const num = (form: FormData, name: string) => (text(form, name) === "" ? undefined : Number(text(form, name).replace(/[\s,]/g, "")));

export async function applyForCredit(_prev: FormState, form: FormData): Promise<FormState> {
  if (form.get("acceptTerms") !== "on") return { error: "Please accept the trade credit terms." };
  const result = await api("/credit/apply", {
    method: "POST",
    token: sessionToken(),
    body: {
      requestedLimit: num(form, "requestedLimit"),
      requestedTermsDays: num(form, "requestedTermsDays"),
      yearsTrading: num(form, "yearsTrading"),
      estimatedMonthlySpend: num(form, "estimatedMonthlySpend"),
      tradeReferences: text(form, "tradeReferences"),
      accountsContact: text(form, "accountsContact") || undefined,
      notes: text(form, "notes") || undefined,
      acceptTerms: true,
    },
  });
  revalidatePath("/account/credit");
  return result.ok ? { success: "Application sent — we review trade credit within three business days, and may contact your references." } : { error: result.message };
}

/** Staff: approve (limit and terms), decline, or suspend. */
export async function decideCredit(_prev: FormState, form: FormData): Promise<FormState> {
  const companyId = text(form, "companyId");
  const decision = text(form, "decision");
  const result = await api(`/credit/accounts/${encodeURIComponent(companyId)}/decide`, {
    method: "POST",
    token: sessionToken(),
    body: { decision, limit: decision === "APPROVE" ? num(form, "limit") : undefined, termsDays: decision === "APPROVE" ? num(form, "termsDays") : undefined, notes: text(form, "notes") || undefined },
  });
  revalidatePath("/admin/credit");
  return result.ok ? { success: decision === "APPROVE" ? "Trade credit approved — the company has been emailed." : decision === "DECLINE" ? "Declined — the company has been emailed." : "Suspended — the company has been emailed." } : { error: result.message };
}
