"use server";

import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

export async function subscribeToNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  if (form.get("consent") !== "on") return { error: "Please tick the box to agree to receive our newsletter." };
  const result = await api<{ subscribed: boolean }>("/newsletter/subscribe", {
    method: "POST",
    body: {
      email: text(form, "email"),
      name: text(form, "name") || null,
      audience: text(form, "audience") || "CUSTOMER",
      province: text(form, "province") || null,
      source: text(form, "source").slice(0, 200) || null,
      consent: "yes",
      website: text(form, "website"),
    },
  });
  if (!result.ok) return { error: result.message };
  return { success: "You're subscribed. Look out for prices, new products and delivery news — you can unsubscribe from any email." };
}

export async function unsubscribeFromNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api<{ email: string }>("/newsletter/unsubscribe", { method: "POST", body: { token: text(form, "token") } });
  if (!result.ok) return { error: result.status === 404 ? "This unsubscribe link isn't valid. It may have been copied incompletely." : result.message };
  return { success: `${result.data.email} is unsubscribed. You won't receive our newsletter again unless you sign up.` };
}
