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

async function post<T = unknown>(path: string, body: unknown = {}, method = "POST") {
  const result = await api<T>(`/bookings/admin${path}`, { method, token: sessionToken(), body });
  revalidatePath("/admin/bookings", "layout");
  revalidatePath("/admin/hire-partners");
  return result;
}

export async function createBooking(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await post<{ id: string }>("", {
    customerEmail: text(form, "customerEmail"),
    enquiryId: text(form, "enquiryId") || null,
    sku: text(form, "sku"),
    basis: text(form, "basis"),
    quantity: Number(text(form, "quantity")),
    startDate: text(form, "startDate"),
    endDate: text(form, "endDate"),
    province: text(form, "province"),
    siteAddress: text(form, "siteAddress"),
    siteNotes: text(form, "siteNotes") || null,
    partnerAmount: Number(text(form, "partnerAmount")),
    quoteSource: text(form, "quoteSource"),
    quoteValidUntil: text(form, "quoteValidUntil") || null,
    preferredPartnerId: text(form, "preferredPartnerId") || null,
  });
  if (!result.ok) return { error: result.message };
  redirect(`/admin/bookings/${result.data.id}`);
}

const simple =
  (path: (form: FormData) => string, body: (form: FormData) => unknown, success: string) =>
  async (form: FormData): Promise<FormState> => {
    const result = await post(path(form), body(form));
    return result.ok ? { success } : { error: result.message };
  };

export async function confirmBookingPayment(_prev: FormState, form: FormData) {
  return simple((f) => `/${text(f, "id")}/payment`, (f) => ({ paymentReference: text(f, "paymentReference") }), "Payment confirmed — dispatch has started.")(form);
}

export async function redispatchBooking(_prev: FormState, form: FormData) {
  return simple((f) => `/${text(f, "id")}/redispatch`, () => ({}), "Dispatch restarted.")(form);
}

export async function cancelBooking(_prev: FormState, form: FormData) {
  return simple((f) => `/${text(f, "id")}/cancel`, (f) => ({ reason: text(f, "reason") }), "Booking cancelled.")(form);
}

export async function staffBookingMessage(_prev: FormState, form: FormData) {
  return simple((f) => `/${text(f, "id")}/messages`, (f) => ({ body: text(f, "body") }), "Message sent.")(form);
}

export async function resolveDispute(_prev: FormState, form: FormData) {
  return simple((f) => `/disputes/${text(f, "disputeId")}/resolve`, (f) => ({ outcome: text(f, "outcome"), resolution: text(f, "resolution") }), "Dispute resolved.")(form);
}

export async function markPayoutPaid(_prev: FormState, form: FormData) {
  return simple((f) => `/payouts/${text(f, "id")}/paid`, (f) => ({ paidReference: text(f, "paidReference") }), "Payout recorded.")(form);
}

export async function reviewFlag(form: FormData) {
  await post(`/flags/${text(form, "id")}`, { status: text(form, "status"), reviewNote: text(form, "reviewNote") || null }, "PATCH");
}

export async function scanFlags(_prev: FormState): Promise<FormState> {
  const result = await post<{ flagged: number }>("/flags/scan");
  return result.ok ? { success: `Scan complete — ${result.data.flagged} new flag(s).` } : { error: result.message };
}

// --- Hire partners ---

function partnerBody(form: FormData) {
  const lat = text(form, "latitude");
  const lng = text(form, "longitude");
  return {
    name: text(form, "name"),
    province: text(form, "province"),
    town: text(form, "town") || null,
    contactName: text(form, "contactName") || null,
    contactEmail: text(form, "contactEmail"),
    contactPhone: text(form, "contactPhone") || null,
    status: text(form, "status") || undefined,
    isGroupEntity: form.get("isGroupEntity") === "on",
    payoutDetailsConfirmed: form.get("payoutDetailsConfirmed") === "on",
    latitude: lat === "" ? null : Number(lat),
    longitude: lng === "" ? null : Number(lng),
    notes: text(form, "notes") || null,
  };
}

export async function savePartner(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await post(id ? `/partners/${id}` : "/partners", partnerBody(form), id ? "PATCH" : "POST");
  return result.ok ? { success: id ? "Partner saved." : "Partner added." } : { error: result.message };
}

export async function linkPartnerUser(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await post(`/partners/${text(form, "id")}/users`, { email: text(form, "email") });
  return result.ok ? { success: "Login linked — they now see the partner portal." } : { error: result.message };
}

export async function unlinkPartnerUser(form: FormData) {
  await post(`/partners/${text(form, "id")}/users/${text(form, "userId")}`, undefined, "DELETE");
}

export async function addFleetUnit(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await post(`/partners/${text(form, "id")}/fleet`, { sku: text(form, "sku"), label: text(form, "label"), province: text(form, "province") });
  return result.ok ? { success: "Fleet added." } : { error: result.message };
}

export async function toggleFleetUnit(form: FormData) {
  await post(`/fleet/${text(form, "unitId")}`, { isActive: text(form, "isActive") === "true" }, "PATCH");
}
