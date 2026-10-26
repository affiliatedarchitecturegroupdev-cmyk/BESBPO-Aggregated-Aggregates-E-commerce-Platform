"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import type { LineKind } from "@/lib/projects";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const back = (id: string, key: "done" | "error", message: string) => redirect(`/admin/projects/${id}?${key}=${encodeURIComponent(message)}`);

export async function updateProject(form: FormData) {
  const id = text(form, "id");
  const result = await api(`/projects/staff/${encodeURIComponent(id)}`, { method: "PATCH", token: sessionToken(), body: { status: text(form, "status") || undefined, staffNotes: text(form, "staffNotes") } });
  revalidatePath(`/admin/projects/${id}`);
  back(id, result.ok ? "done" : "error", result.ok ? "Saved." : result.message);
}

export type ProposalInput = {
  lines: { kind: LineKind; description: string; quantity: number; unit: string; unitPrice: number; unitCost: number | null; partnerName: string }[];
  milestones: { label: string; percent: number }[];
  message: string;
  validDays: number;
};

export async function saveProposal(id: string, input: ProposalInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await api(`/projects/staff/${encodeURIComponent(id)}/proposal`, { method: "PUT", token: sessionToken(), body: input });
  revalidatePath(`/admin/projects/${id}`);
  return result.ok ? { ok: true } : { ok: false, error: result.message };
}

export async function sendProposal(form: FormData) {
  const id = text(form, "id");
  const result = await api<{ url: string }>(`/projects/staff/${encodeURIComponent(id)}/send`, { method: "POST", token: sessionToken() });
  revalidatePath(`/admin/projects/${id}`);
  back(id, result.ok ? "done" : "error", result.ok ? "Proposal emailed to the client. Their link works until it's accepted, it expires, or you change and resend the proposal." : result.message);
}

export async function recordMilestone(form: FormData) {
  const id = text(form, "projectId");
  const result = await api(`/projects/staff/milestones/${encodeURIComponent(text(form, "milestoneId"))}/paid`, { method: "POST", token: sessionToken(), body: { reference: text(form, "reference") || null } });
  revalidatePath(`/admin/projects/${id}`);
  back(id, result.ok ? "done" : "error", result.ok ? "Payment recorded — the client has been emailed a receipt." : result.message);
}
