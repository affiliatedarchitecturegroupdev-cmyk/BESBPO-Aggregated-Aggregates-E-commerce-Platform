"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export type BestWithFormState = { error?: string; success?: string } | null;

const sku = (form: FormData, name: string) => String(form.get(name) ?? "").trim().toUpperCase();

function refresh() {
  revalidateTag("best-with");
  revalidatePath("/admin/best-with");
}

/** Staff: pin a pairing (suggested first, with an optional note) or hide one (never suggested). */
export async function saveBestWithRule(_: BestWithFormState, form: FormData): Promise<BestWithFormState> {
  const action = form.get("action") === "HIDE" ? "HIDE" : "PIN";
  const note = String(form.get("note") ?? "").trim().slice(0, 120);
  const result = await api("/merchandising/best-with/rules", {
    method: "PUT",
    token: sessionToken(),
    body: { productSku: sku(form, "productSku"), pairedSku: sku(form, "pairedSku"), action, ...(note ? { note } : {}) },
  });
  if (!result.ok) return { error: result.message };
  refresh();
  return { success: action === "PIN" ? "Pinned — it now shows first on that product's page." : "Hidden — it won't be suggested on that product's page." };
}

export async function removeBestWithRule(form: FormData) {
  await api("/merchandising/best-with/rules", { method: "DELETE", token: sessionToken(), body: { productSku: sku(form, "productSku"), pairedSku: sku(form, "pairedSku") } });
  refresh();
}

export async function recomputeBestWith() {
  await api("/merchandising/best-with/recompute", { method: "POST", token: sessionToken() });
  refresh();
}
