"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { api, apiUpload } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export type ImportState = { error?: string } | null;

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** Staff: upload a file of products; every row is checked and shown as a preview. Nothing is added yet. */
export async function previewImport(_prev: ImportState, form: FormData): Promise<ImportState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the product list (Excel .xlsx or .csv)." };
  if (file.size > 5 * 1024 * 1024) return { error: "The file is over 5 MB — split it and import it in parts." };
  const upload = new FormData();
  upload.append("file", file, file.name);
  for (const field of ["supplierLocationId", "validUntil"]) if (text(form, field)) upload.append(field, text(form, field));
  const result = await apiUpload<{ id: string }>("/catalogue-import/staff", upload, sessionToken());
  if (!result.ok) return { error: result.message };
  redirect(`/admin/catalogue-import/${result.data.id}`);
}

/** Adds the preview's new products; product pages, listings and search pick them up straight away. */
export async function applyImport(form: FormData) {
  const id = text(form, "id");
  const result = await api<{ counts: { NEW: number } }>(`/catalogue-import/staff/${encodeURIComponent(id)}/apply`, { method: "POST", token: sessionToken() });
  revalidatePath(`/admin/catalogue-import/${id}`);
  if (!result.ok) redirect(`/admin/catalogue-import/${id}?error=${encodeURIComponent(result.message)}`);
  revalidateTag("catalogue");
  revalidatePath("/", "layout");
  redirect(`/admin/catalogue-import/${id}?done=1`);
}

export async function discardImport(form: FormData) {
  const id = text(form, "id");
  const result = await api(`/catalogue-import/staff/${encodeURIComponent(id)}/discard`, { method: "POST", token: sessionToken() });
  revalidatePath(`/admin/catalogue-import/${id}`);
  if (!result.ok) redirect(`/admin/catalogue-import/${id}?error=${encodeURIComponent(result.message)}`);
}
