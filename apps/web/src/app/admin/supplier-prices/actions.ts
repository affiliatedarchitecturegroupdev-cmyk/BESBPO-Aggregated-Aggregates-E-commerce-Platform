"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { api, apiUpload } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export type UploadState = { error?: string } | null;

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** A price going live or coming down changes product pages, listings and search: refresh them straight away. */
function refreshStorefront() {
  revalidateTag("prices");
  revalidatePath("/", "layout");
}

/** Staff: upload a supplier's price list; every row is matched and waits for approval. */
export async function uploadPriceList(_prev: UploadState, form: FormData): Promise<UploadState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the supplier's price list (Excel .xlsx or .csv)." };
  if (file.size > 5 * 1024 * 1024) return { error: "The file is over 5 MB — save just the price list and try again." };
  const upload = new FormData();
  upload.append("file", file, file.name);
  for (const field of ["supplierLocationId", "supplierName", "validUntil", "notes"]) if (text(form, field)) upload.append(field, text(form, field));
  const result = await apiUpload<{ id: string }>("/prices/staff/lists", upload, sessionToken());
  if (!result.ok) return { error: result.message };
  redirect(`/admin/supplier-prices/${result.data.id}`);
}

export async function approveLine(form: FormData) {
  const price = text(form, "price");
  const result = await api(`/prices/staff/lines/${encodeURIComponent(text(form, "id"))}/approve`, { method: "POST", token: sessionToken(), body: price ? { price: Number(price) } : {} });
  revalidatePath(`/admin/supplier-prices/${text(form, "listId")}`);
  if (result.ok) refreshStorefront();
  else redirect(`/admin/supplier-prices/${text(form, "listId")}?error=${encodeURIComponent(result.message)}#line-${text(form, "id")}`);
}

export async function rejectLine(form: FormData) {
  await api(`/prices/staff/lines/${encodeURIComponent(text(form, "id"))}/reject`, { method: "POST", token: sessionToken() });
  revalidatePath(`/admin/supplier-prices/${text(form, "listId")}`);
}

export async function mapLine(form: FormData) {
  const result = await api(`/prices/staff/lines/${encodeURIComponent(text(form, "id"))}`, { method: "PUT", token: sessionToken(), body: { sku: text(form, "sku"), unit: text(form, "unit") || null } });
  revalidatePath(`/admin/supplier-prices/${text(form, "listId")}`);
  if (!result.ok) redirect(`/admin/supplier-prices/${text(form, "listId")}?error=${encodeURIComponent(result.message)}#line-${text(form, "id")}`);
}

export async function approveAll(form: FormData) {
  const listId = text(form, "listId");
  const result = await api<{ approved: number; problems: string[] }>(`/prices/staff/lists/${encodeURIComponent(listId)}/approve-all`, { method: "POST", token: sessionToken() });
  revalidatePath(`/admin/supplier-prices/${listId}`);
  refreshStorefront();
  const note = result.ok ? `${result.data.approved} price${result.data.approved === 1 ? "" : "s"} now live.${result.data.problems.length ? ` Not approved: ${result.data.problems.join(" ")}` : ""}` : result.message;
  redirect(`/admin/supplier-prices/${listId}?${result.ok && !result.data.problems.length ? "done" : "error"}=${encodeURIComponent(note)}`);
}

export async function withdrawPrice(form: FormData) {
  await api(`/prices/staff/live/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/admin/supplier-prices");
  refreshStorefront();
}
