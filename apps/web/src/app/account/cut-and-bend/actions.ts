"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

async function respond(form: FormData, action: "accept" | "decline"): Promise<FormState> {
  const id = String(form.get("id") ?? "");
  const result = await api(`/cut-and-bend/mine/${encodeURIComponent(id)}/${action}`, { method: "POST", token: sessionToken(), body: {} });
  revalidatePath(`/account/cut-and-bend/${id}`);
  revalidatePath("/account/cut-and-bend");
  if (!result.ok) return { error: result.message };
  return { success: action === "accept" ? "Thank you — quote accepted. We'll confirm payment and the delivery slot with you." : "Quote declined. Reply to our email if a revised quote would help." };
}

export async function acceptScheduleQuote(_prev: FormState, form: FormData): Promise<FormState> {
  if (form.get("checked") !== "on") return { error: "Please tick the box to confirm you've checked the schedule." };
  return respond(form, "accept");
}

export async function declineScheduleQuote(_prev: FormState, form: FormData): Promise<FormState> {
  return respond(form, "decline");
}
