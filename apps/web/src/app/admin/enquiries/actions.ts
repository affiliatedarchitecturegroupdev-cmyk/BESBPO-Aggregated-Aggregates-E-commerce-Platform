"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

export async function updateEnquiry(form: FormData) {
  await api(`/enquiries/admin/${encodeURIComponent(text(form, "id"))}`, {
    method: "PATCH",
    token: sessionToken(),
    body: { status: text(form, "status") || undefined, staffNotes: text(form, "staffNotes") || null },
  });
  revalidatePath("/admin/enquiries");
}

/** POPIA: erase an enquiry (and its email log) on request. Admins only — the API enforces it. */
export async function eraseEnquiry(form: FormData) {
  await api(`/enquiries/admin/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/admin/enquiries");
}
