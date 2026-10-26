"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const amount = (form: FormData, name: string) => (text(form, name) ? Number(text(form, name)) : null);

/** Company admin: invite a colleague by email (docs/company-accounts.md). */
export async function inviteMember(_: FormState, form: FormData): Promise<FormState> {
  const role = text(form, "companyRole");
  const result = await api("/company/team/invites", {
    method: "POST",
    token: sessionToken(),
    body: { email: text(form, "email"), companyRole: role, ...(role === "BUYER" ? { spendLimit: amount(form, "spendLimit") } : {}) },
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/account/team");
  return { success: `Invitation sent to ${text(form, "email")}. The link works for 14 days.` };
}

export async function revokeInvite(form: FormData) {
  await api(`/company/team/invites/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/account/team");
}

export async function updateMember(form: FormData) {
  const role = text(form, "companyRole");
  const result = await api(`/company/team/members/${encodeURIComponent(text(form, "id"))}`, {
    method: "PATCH",
    token: sessionToken(),
    body: { companyRole: role, spendLimit: role === "BUYER" ? amount(form, "spendLimit") : null },
  });
  revalidatePath("/account/team");
  if (!result.ok) redirect(`/account/team?error=${encodeURIComponent(result.message)}`);
}

export async function removeMember(form: FormData) {
  const result = await api(`/company/team/members/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/account/team");
  if (!result.ok) redirect(`/account/team?error=${encodeURIComponent(result.message)}`);
}

export async function saveCompanySettings(_: FormState, form: FormData): Promise<FormState> {
  const result = await api("/company/settings", {
    method: "PUT",
    token: sessionToken(),
    body: { approvalThreshold: amount(form, "approvalThreshold"), requirePurchaseOrder: form.get("requirePurchaseOrder") === "on" },
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/account/team");
  return { success: "Saved — new orders follow these settings." };
}

/** An approver approves or declines a buyer's order. */
export async function decideOrder(form: FormData) {
  const result = await api(`/company/approvals/${encodeURIComponent(text(form, "orderId"))}`, {
    method: "POST",
    token: sessionToken(),
    body: { decision: text(form, "decision"), note: text(form, "note") || null },
  });
  revalidatePath("/account/team");
  revalidatePath("/account/dashboard");
  redirect(`/account/team?${result.ok ? "done" : "error"}=${encodeURIComponent(result.ok ? (text(form, "decision") === "APPROVE" ? "Approved — the buyer has been emailed and the order can now be paid." : "Declined — the order is cancelled and the buyer has been emailed.") : result.message)}#approvals`);
}

/** Accept an invitation with the signed-in account. */
export async function acceptInvite(form: FormData) {
  const result = await api<{ companyName: string }>("/company/invites/accept", { method: "POST", token: sessionToken(), body: { token: text(form, "token") } });
  if (!result.ok) redirect(`/account/team/join?token=${encodeURIComponent(text(form, "token"))}&error=${encodeURIComponent(result.message)}`);
  revalidatePath("/", "layout");
  redirect(`/account/team?joined=${encodeURIComponent(result.data.companyName)}`);
}
