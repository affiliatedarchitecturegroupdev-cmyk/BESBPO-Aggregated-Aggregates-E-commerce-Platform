"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import type { ProjectList } from "@/lib/project-lists";
import { getSession, sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const quantity = (form: FormData) => {
  const raw = text(form, "quantity").replace(",", ".");
  return raw === "" ? null : Number(raw);
};
const refresh = (id?: string) => {
  revalidatePath("/account/projects");
  if (id) revalidatePath(`/account/projects/${id}`);
};

/** For the "Save to project" button: whether the visitor is signed in, and their lists. */
export async function myProjectLists(): Promise<{ signedIn: boolean; lists: { id: string; name: string; count: number }[] }> {
  if (!(await getSession())) return { signedIn: false, lists: [] };
  const result = await api<ProjectList[]>("/project-lists", { token: sessionToken() });
  return { signedIn: true, lists: result.ok ? result.data.map((l) => ({ id: l.id, name: l.name, count: l.items.length })) : [] };
}

/** Save a product to a list — or to a new list named in the same form. */
export async function saveToProject(_prev: FormState, form: FormData): Promise<FormState & { listId?: string }> {
  const token = sessionToken();
  let listId = text(form, "listId");
  if (listId === "new" || !listId) {
    const created = await api<ProjectList>("/project-lists", { method: "POST", token, body: { name: text(form, "newName") } });
    if (!created.ok) return { error: created.message };
    listId = created.data.id;
  }
  const result = await api<ProjectList>(`/project-lists/${encodeURIComponent(listId)}/items`, {
    method: "POST",
    token,
    body: { sku: text(form, "sku"), unit: text(form, "unit"), quantity: quantity(form), stage: text(form, "stage") || undefined, note: text(form, "note") || null },
  });
  refresh(listId);
  if (!result.ok) return { error: result.message };
  return { success: `Saved to "${result.data.name}".`, listId };
}

export async function createProjectList(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api<ProjectList>("/project-lists", {
    method: "POST",
    token: sessionToken(),
    body: { name: text(form, "name"), siteName: text(form, "siteName") || null, province: text(form, "province") || null, neededBy: text(form, "neededBy") || null },
  });
  if (!result.ok) return { error: result.message };
  refresh();
  redirect(`/account/projects/${result.data.id}`);
}

export async function updateProjectList(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await api(`/project-lists/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token: sessionToken(),
    body: { name: text(form, "name"), siteName: text(form, "siteName") || null, province: text(form, "province") || null, neededBy: text(form, "neededBy") || null, notes: text(form, "notes") || null },
  });
  refresh(id);
  return result.ok ? { success: "Saved." } : { error: result.message };
}

export async function updateProjectItem(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "listId");
  const result = await api(`/project-lists/${encodeURIComponent(id)}/items/${encodeURIComponent(text(form, "itemId"))}`, {
    method: "PATCH",
    token: sessionToken(),
    body: { unit: text(form, "unit") || undefined, quantity: quantity(form), stage: text(form, "stage") || undefined, note: text(form, "note") || null },
  });
  refresh(id);
  return result.ok ? null : { error: result.message };
}

export async function removeProjectItem(form: FormData) {
  const id = text(form, "listId");
  await api(`/project-lists/${encodeURIComponent(id)}/items/${encodeURIComponent(text(form, "itemId"))}`, { method: "DELETE", token: sessionToken() });
  refresh(id);
}

export async function shareProjectList(form: FormData) {
  const id = text(form, "id");
  await api(`/project-lists/${encodeURIComponent(id)}/share`, { method: "POST", token: sessionToken(), body: { enabled: text(form, "enabled") === "yes" } });
  refresh(id);
}

export async function duplicateProjectList(form: FormData) {
  const result = await api<ProjectList>(`/project-lists/${encodeURIComponent(text(form, "id"))}/duplicate`, { method: "POST", token: sessionToken() });
  refresh();
  if (result.ok) redirect(`/account/projects/${result.data.id}`);
}

export async function deleteProjectList(form: FormData) {
  await api(`/project-lists/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  refresh();
  redirect("/account/projects");
}

/** Save a copy of someone's shared list into your own account. */
export async function copySharedList(form: FormData) {
  const token = text(form, "token");
  if (!(await getSession())) redirect(`/account/login?next=${encodeURIComponent(`/projects/shared/${token}`)}`);
  const result = await api<ProjectList>(`/project-lists/shared/${encodeURIComponent(token)}/copy`, { method: "POST", token: sessionToken() });
  refresh();
  if (result.ok) redirect(`/account/projects/${result.data.id}`);
}
