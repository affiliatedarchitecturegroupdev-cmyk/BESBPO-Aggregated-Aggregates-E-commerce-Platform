"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export type SynonymFormState = { error?: string; success?: string } | null;

const PAGE = "/admin/insights/search";
const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** Staff: mark a catalogue gap added, ignored or open again, with an optional note. */
export async function updateGap(form: FormData) {
  const id = text(form, "id");
  const status = text(form, "status");
  if (!id || !["OPEN", "ADDED", "IGNORED"].includes(status)) return;
  await api(`/discovery/gaps/${encodeURIComponent(id)}`, { method: "PUT", token: sessionToken(), body: { status, note: text(form, "note") || null } });
  revalidatePath(PAGE);
}

/** Staff: add or change a synonym group — the storefront search uses it within a minute, no code change. */
export async function saveSynonym(_: SynonymFormState, form: FormData): Promise<SynonymFormState> {
  const id = text(form, "id");
  const terms = text(form, "terms")
    .split(/[,;\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const result = await api(id ? `/discovery/staff/synonyms/${encodeURIComponent(id)}` : "/discovery/staff/synonyms", { method: id ? "PUT" : "POST", token: sessionToken(), body: { terms } });
  if (!result.ok) return { error: result.message };
  revalidateTag("synonyms");
  revalidatePath(PAGE);
  return { success: id ? "Saved — search uses it straight away." : "Added — search uses it straight away." };
}

export async function deleteSynonym(form: FormData) {
  const id = text(form, "id");
  if (!id) return;
  await api(`/discovery/staff/synonyms/${encodeURIComponent(id)}`, { method: "DELETE", token: sessionToken() });
  revalidateTag("synonyms");
  revalidatePath(PAGE);
}
