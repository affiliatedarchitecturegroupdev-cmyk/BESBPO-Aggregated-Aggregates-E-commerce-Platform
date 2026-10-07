"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const num = (form: FormData, name: string) => (text(form, name) === "" ? undefined : Number(text(form, name)));

async function post(path: string, body: unknown = {}) {
  return api<{ status?: string; bookingId?: string }>(`/partner-portal${path}`, { method: "POST", token: sessionToken(), body });
}

export async function respondToOffer(_prev: FormState, form: FormData): Promise<FormState> {
  const accept = text(form, "decision") === "accept";
  const result = await post(`/offers/${encodeURIComponent(text(form, "id"))}/${accept ? "accept" : "decline"}`);
  revalidatePath("/partners/portal");
  if (!result.ok) return { error: result.message };
  if (accept && result.data.bookingId) redirect(`/partners/portal/jobs/${result.data.bookingId}`);
  return { success: "Offer declined — it has gone to the next partner." };
}

export async function startJob(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await post(`/jobs/${encodeURIComponent(id)}/start`, { code: text(form, "code") });
  revalidatePath(`/partners/portal/jobs/${id}`);
  return result.ok ? { success: "Code accepted — the job has started." } : { error: result.message };
}

export async function addJobCard(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await post(`/jobs/${encodeURIComponent(id)}/job-cards`, {
    workDate: text(form, "workDate"),
    hoursWorked: num(form, "hoursWorked"),
    startHourMeter: num(form, "startHourMeter"),
    endHourMeter: num(form, "endHourMeter"),
    loads: num(form, "loads"),
    notes: text(form, "notes") || null,
  });
  revalidatePath(`/partners/portal/jobs/${id}`);
  return result.ok ? { success: "Job card saved." } : { error: result.message };
}

export async function sendPartnerMessage(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await post(`/jobs/${encodeURIComponent(id)}/messages`, { body: text(form, "body") });
  revalidatePath(`/partners/portal/jobs/${id}`);
  return result.ok ? null : { error: result.message };
}

export async function partnerDispute(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await post(`/jobs/${encodeURIComponent(id)}/dispute`, { reason: text(form, "reason") });
  revalidatePath(`/partners/portal/jobs/${id}`);
  return result.ok ? { success: "Dispute logged — our team will be in touch." } : { error: result.message };
}

export async function blockDates(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await post(`/fleet/${encodeURIComponent(text(form, "unitId"))}/blocks`, {
    startsOn: text(form, "startsOn"),
    endsOn: text(form, "endsOn"),
    reason: text(form, "reason") || null,
  });
  revalidatePath("/partners/portal");
  return result.ok ? { success: "Dates blocked." } : { error: result.message };
}

export async function unblockDates(form: FormData) {
  await api(`/partner-portal/blocks/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/partners/portal");
}
