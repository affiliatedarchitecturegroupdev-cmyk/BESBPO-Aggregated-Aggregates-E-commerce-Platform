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

const refresh = (id: string) => {
  revalidatePath(`/admin/cut-and-bend/${id}`);
  revalidatePath("/admin/cut-and-bend");
};

/** Staff's written price, confirmed with the merchant — emails the customer. */
export async function quoteSchedule(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const amount = Number(text(form, "amount").replace(/[\s,R]/g, ""));
  if (!(amount > 0)) return { error: "Enter the quoted total in rand." };
  const result = await api(`/cut-and-bend/admin/${encodeURIComponent(id)}/quote`, {
    method: "POST",
    token: sessionToken(),
    body: { amount, validUntil: text(form, "validUntil"), notes: text(form, "notes") },
  });
  refresh(id);
  return result.ok ? { success: "Quote sent — the customer has been emailed." } : { error: result.message };
}

export async function updateSchedule(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await api(`/cut-and-bend/admin/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token: sessionToken(),
    body: { status: text(form, "status") || undefined, staffNotes: text(form, "staffNotes") || null },
  });
  refresh(id);
  return result.ok ? { success: "Saved." } : { error: result.message };
}

/** POPIA: erase a schedule, its file and its email log. Admins only — the API enforces it. */
export async function eraseSchedule(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  if (text(form, "confirm") !== "ERASE") return { error: "Type ERASE to confirm." };
  const result = await api(`/cut-and-bend/admin/${encodeURIComponent(id)}`, { method: "DELETE", token: sessionToken() });
  if (!result.ok) return { error: result.message };
  revalidatePath("/admin/cut-and-bend");
  redirect("/admin/cut-and-bend");
}
