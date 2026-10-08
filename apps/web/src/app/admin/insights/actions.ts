"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

/** Saves the current Insights tab and filters as a named view (private, or shared with all staff). */
export async function saveView(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api("/insights/views", {
    method: "POST",
    token: sessionToken(),
    body: { name: text(form, "name"), path: text(form, "path"), query: text(form, "query"), shared: form.get("shared") === "on" },
  });
  revalidatePath("/admin/insights", "layout");
  return result.ok ? { success: "View saved." } : { error: result.message };
}

export async function deleteView(form: FormData) {
  await api(`/insights/views/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/admin/insights", "layout");
}

/** Admins: send last week's summary email to yourself, to check it before Monday. */
export async function sendDigestToMe(_prev: FormState): Promise<FormState> {
  const result = await api<{ queued: number; to: string }>("/insights/digest/send-to-me", { method: "POST", token: sessionToken() });
  if (!result.ok) return { error: result.message };
  return result.data.queued
    ? { success: `Sent to ${result.data.to}. If no email provider is set up yet, it's in the log on Admin → Notifications.` }
    : { error: "The weekly email is switched off on Admin → Notifications." };
}
