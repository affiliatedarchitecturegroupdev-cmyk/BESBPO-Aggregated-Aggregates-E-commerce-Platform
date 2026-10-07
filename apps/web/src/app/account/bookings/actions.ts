"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

async function call(id: string, action: string, body?: unknown): Promise<FormState> {
  const result = await api(`/bookings/${encodeURIComponent(id)}/${action}`, { method: "POST", token: sessionToken(), body: body ?? {} });
  revalidatePath(`/account/bookings/${id}`);
  revalidatePath("/account/bookings");
  return result.ok ? null : { error: result.message };
}

export async function acceptBookingQuote(_prev: FormState, form: FormData): Promise<FormState> {
  return call(text(form, "id"), "accept");
}

export async function declineBookingQuote(_prev: FormState, form: FormData): Promise<FormState> {
  return call(text(form, "id"), "decline");
}

export async function sendBookingMessage(_prev: FormState, form: FormData): Promise<FormState> {
  return call(text(form, "id"), "messages", { body: text(form, "body") });
}

export async function signOffBooking(_prev: FormState, form: FormData): Promise<FormState> {
  const rating = Number(text(form, "rating"));
  return (await call(text(form, "id"), "sign-off", Number.isInteger(rating) && rating >= 1 && rating <= 5 ? { rating } : {})) ?? { success: "Thank you — the job is signed off." };
}

export async function disputeBooking(_prev: FormState, form: FormData): Promise<FormState> {
  return (await call(text(form, "id"), "dispute", { reason: text(form, "reason") })) ?? { success: "Your dispute is logged. The partner's payment is on hold while our team looks into it." };
}

/** A fresh arrival code (any earlier code stops working). Shown once, never stored by us in plain text. */
export async function newArrivalCode(id: string): Promise<{ code?: string; error?: string }> {
  const result = await api<{ code: string }>(`/bookings/${encodeURIComponent(id)}/arrival-code`, { method: "POST", token: sessionToken(), body: {} });
  return result.ok ? { code: result.data.code } : { error: result.message };
}
