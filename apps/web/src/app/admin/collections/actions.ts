"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export type CollectionFormState = { error?: string; success?: string } | null;

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** Collections show on the homepage, any department page and their own pages: refresh them all straight away. */
function refresh() {
  revalidateTag("merchandising");
  revalidatePath("/", "layout");
}

/** Staff: create a collection, or update one (when the form carries its id). */
export async function saveCollection(_: CollectionFormState, form: FormData): Promise<CollectionFormState> {
  const id = text(form, "id");
  const placements = [...(form.get("homepage") ? ["HOMEPAGE"] : []), ...form.getAll("department").map((d) => `DEPARTMENT:${String(d)}`)];
  const maxPrice = text(form, "maxPrice");
  const body = {
    title: text(form, "title"),
    slug: text(form, "slug") || undefined,
    subtitle: text(form, "subtitle") || undefined,
    description: text(form, "description") || undefined,
    skus: text(form, "skus")
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean),
    rule: {
      query: text(form, "query") || undefined,
      department: text(form, "ruleDepartment") || undefined,
      category: text(form, "ruleCategory") || undefined,
      availability: text(form, "availability") || undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    },
    placements,
    startsAt: text(form, "startsAt") ? new Date(`${text(form, "startsAt")}T00:00:00+02:00`).toISOString() : null,
    endsAt: text(form, "endsAt") ? new Date(`${text(form, "endsAt")}T23:59:59+02:00`).toISOString() : null,
    isActive: form.get("isActive") === "on",
    sortOrder: Number(text(form, "sortOrder")) || 0,
  };
  const result = await api<{ slug: string }>(id ? `/merchandising/staff/collections/${id}` : "/merchandising/staff/collections", { method: id ? "PUT" : "POST", token: sessionToken(), body });
  if (!result.ok) return { error: result.message };
  refresh();
  return { success: `${id ? "Saved" : "Created"} — /collections/${result.data.slug}` };
}

export async function deleteCollection(form: FormData) {
  await api(`/merchandising/staff/collections/${text(form, "id")}`, { method: "DELETE", token: sessionToken() });
  refresh();
}
