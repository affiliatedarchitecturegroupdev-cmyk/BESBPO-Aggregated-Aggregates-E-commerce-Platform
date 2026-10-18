"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

/** The supplier: can load it (and from when), or can't. */
export async function respondToOrder(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "orderId");
  const decision = text(form, "decision") === "DECLINE" ? "DECLINE" : "ACCEPT";
  const result = await api(`/supplier-portal/orders/${encodeURIComponent(id)}/respond`, {
    method: "POST",
    token: sessionToken(),
    body: { decision, readyAt: text(form, "readyAt") || undefined, note: text(form, "note") || undefined },
  });
  revalidatePath(`/suppliers/portal/orders/${id}`);
  revalidatePath("/suppliers/portal");
  return result.ok ? { success: decision === "ACCEPT" ? "Thanks — our team has been told you can load it." : "Thanks — our team will find another supplier." } : { error: result.message };
}

export async function setDropReady(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "orderId");
  const result = await api(`/supplier-portal/drops/${encodeURIComponent(text(form, "dropId"))}/ready`, { method: "PATCH", token: sessionToken(), body: { readyAt: text(form, "readyAt") } });
  revalidatePath(`/suppliers/portal/orders/${id}`);
  return result.ok ? { success: "Ready date saved." } : { error: result.message };
}

/** Staff or the supplier: a proof-of-delivery link for the driver (shown once). */
export async function createPodLink(_prev: FormState, form: FormData): Promise<FormState> {
  const dropId = text(form, "dropId");
  const orderId = text(form, "orderId");
  const path = dropId ? `/deliveries/drops/${encodeURIComponent(dropId)}/pod-link` : `/deliveries/orders/${encodeURIComponent(orderId)}/pod-link`;
  const result = await api<{ url: string }>(path, { method: "POST", token: sessionToken() });
  revalidatePath(`/admin/orders/${orderId}/deliveries`);
  return result.ok ? { success: `Send this link to the driver (it works once, for this delivery): ${result.data.url}` } : { error: result.message };
}
