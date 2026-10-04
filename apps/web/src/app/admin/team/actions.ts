"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

const ROLE_LABEL: Record<string, string> = { STAFF: "staff", ADMIN: "an admin", CUSTOMER: "a customer" };

export async function addTeamMember(_prev: FormState, form: FormData): Promise<FormState> {
  const email = text(form, "email");
  const role = text(form, "role");
  const result = await api<{ email: string }>("/team", { method: "POST", token: sessionToken(), body: { email, role } });
  if (!result.ok) return { error: result.message };
  revalidatePath("/admin/team");
  return { success: `${result.data.email} is now ${ROLE_LABEL[role]}. It works on their next click — no need to sign out.` };
}

export async function changeTeamRole(_prev: FormState, form: FormData): Promise<FormState> {
  const role = text(form, "role");
  const result = await api<{ email: string }>(`/team/${encodeURIComponent(text(form, "userId"))}`, {
    method: "PATCH",
    token: sessionToken(),
    body: { role },
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/admin/team");
  return { success: role === "CUSTOMER" ? `${result.data.email} no longer has admin access.` : `${result.data.email} is now ${ROLE_LABEL[role]}.` };
}
