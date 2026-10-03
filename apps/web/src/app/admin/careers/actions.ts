"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

function refresh() {
  revalidateTag("cms");
  revalidatePath("/careers", "layout");
  revalidatePath("/admin/careers", "layout");
}

export async function saveVacancy(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await api<{ id: string }>(id ? `/careers/admin/vacancies/${encodeURIComponent(id)}` : "/careers/admin/vacancies", {
    method: id ? "PATCH" : "POST",
    token: sessionToken(),
    body: {
      title: text(form, "title"),
      department: text(form, "department"),
      location: text(form, "location"),
      employmentType: text(form, "employmentType"),
      workplace: text(form, "workplace"),
      summary: text(form, "summary"),
      description: String(form.get("description") ?? ""),
      salary: text(form, "salary") || null,
      closingDate: text(form, "closingDate") || null,
      status: text(form, "status"),
    },
  });
  if (!result.ok) return { error: result.message };
  refresh();
  if (!id) redirect(`/admin/careers/${result.data.id}?created=1`);
  return { success: text(form, "status") === "OPEN" ? "Saved — the advert is live on /careers within a minute." : "Saved." };
}

export async function deleteVacancy(form: FormData) {
  await api(`/careers/admin/vacancies/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  refresh();
  redirect("/admin/careers");
}

export async function updateApplication(form: FormData) {
  await api(`/careers/admin/applications/${encodeURIComponent(text(form, "id"))}`, {
    method: "PATCH",
    token: sessionToken(),
    body: { status: text(form, "status") || undefined, staffNotes: text(form, "staffNotes") || null },
  });
  revalidatePath("/admin/careers", "layout");
}

export async function deleteApplication(form: FormData) {
  await api(`/careers/admin/applications/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/admin/careers", "layout");
}

/** Newsletter: erase a subscriber on request (POPIA). Kept here with the other people-data admin actions. */
export async function eraseSubscriber(form: FormData) {
  await api(`/newsletter/admin/subscribers/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/admin/newsletter");
}
