"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

/** Staff: confirm, dispatch, deliver or reschedule a drop. */
export async function updateDrop(_prev: FormState, form: FormData): Promise<FormState> {
  const orderId = text(form, "orderId");
  const body: Record<string, string> = {};
  for (const name of ["status", "scheduledFor", "carrier", "externalPartnerName", "trackingRef", "notes"]) if (text(form, name)) body[name] = text(form, name);
  const result = await api(`/deliveries/drops/${encodeURIComponent(text(form, "dropId"))}`, { method: "PATCH", token: sessionToken(), body });
  revalidatePath(`/admin/orders/${orderId}/deliveries`);
  revalidatePath("/admin/deliveries");
  const done: Record<string, string> = { CONFIRMED: "Date confirmed.", DISPATCHED: "Dispatched — the customer has been emailed.", DELIVERED: "Marked delivered." };
  return result.ok ? { success: done[body.status ?? ""] ?? "Saved." } : { error: result.message };
}

/** Staff: give the order to a supplier to load (emails the supplier's portal logins). */
export async function assignSupplier(_prev: FormState, form: FormData): Promise<FormState> {
  const orderId = text(form, "orderId");
  const result = await api<{ supplier: string; portalLogins: number; emailed: boolean }>(`/supplier-portal/orders/${encodeURIComponent(orderId)}/assign`, {
    method: "POST",
    token: sessionToken(),
    body: { supplierId: text(form, "supplierId"), notify: form.get("notify") === "on" },
  });
  revalidatePath(`/admin/orders/${orderId}/deliveries`);
  if (!result.ok) return { error: result.message };
  const r = result.data;
  return { success: `Assigned to ${r.supplier}. ${r.emailed ? "Its portal logins have been emailed." : r.portalLogins === 0 ? "It has no portal logins yet — call or email it, or link a login on the supplier's page." : "No email sent."}` };
}

export async function linkSupplierLogin(_prev: FormState, form: FormData): Promise<FormState> {
  const supplierId = text(form, "supplierId");
  const result = await api(`/supplier-portal/suppliers/${encodeURIComponent(supplierId)}/logins`, { method: "POST", token: sessionToken(), body: { email: text(form, "email") } });
  revalidatePath(`/admin/suppliers/${supplierId}`);
  return result.ok ? { success: "Linked — that login now opens the supplier portal." } : { error: result.message };
}

export async function unlinkSupplierLogin(_prev: FormState, form: FormData): Promise<FormState> {
  const supplierId = text(form, "supplierId");
  const result = await api(`/supplier-portal/suppliers/${encodeURIComponent(supplierId)}/logins/${encodeURIComponent(text(form, "userId"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath(`/admin/suppliers/${supplierId}`);
  return result.ok ? { success: "Unlinked — it's an ordinary customer account again." } : { error: result.message };
}

/** Staff: the lead time per category, in working days. Rows left blank are removed. */
export async function saveLeadTimes(_prev: FormState, form: FormData): Promise<FormState> {
  const slugs = form.getAll("categorySlug").map(String);
  const mins = form.getAll("minDays").map(String);
  const maxs = form.getAll("maxDays").map(String);
  const notes = form.getAll("note").map(String);
  const items = slugs.flatMap((categorySlug, i) =>
    mins[i]?.trim() && maxs[i]?.trim() ? [{ categorySlug, minDays: Number(mins[i]), maxDays: Number(maxs[i]), ...(notes[i]?.trim() ? { note: notes[i].trim() } : {}) }] : [],
  );
  const result = await api("/content/lead-times", { method: "PUT", token: sessionToken(), body: { items } });
  revalidatePath("/admin/lead-times");
  revalidateTag("cms");
  return result.ok ? { success: `Saved ${items.length} lead time${items.length === 1 ? "" : "s"}.` } : { error: result.message };
}
