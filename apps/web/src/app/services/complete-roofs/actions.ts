"use server";

import { api } from "@/lib/api";
import type { Estimate, RoofBrief } from "@/lib/projects";
import { sessionToken } from "@/lib/session";

/** The instant take-off for a roof brief — quantities only. */
export async function estimateRoof(brief: RoofBrief): Promise<{ ok: true; estimate: Estimate } | { ok: false; error: string }> {
  const result = await api<Estimate>("/projects/estimate", { method: "POST", body: { package: "ROOF", brief } });
  return result.ok ? { ok: true, estimate: result.data } : { ok: false, error: result.message };
}

/** Sends the brief; signed-in clients' contact details come from their account. */
export async function sendRoofBrief(input: {
  brief: RoofBrief;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  siteAddress?: string;
  province: string;
  notes?: string;
  privacyAccepted: boolean;
}): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const result = await api<{ reference: string }>("/projects", {
    method: "POST",
    token: sessionToken(),
    body: {
      package: "ROOF",
      brief: input.brief,
      province: input.province,
      privacyAccepted: input.privacyAccepted,
      ...(input.contactName?.trim() ? { contactName: input.contactName.trim() } : {}),
      ...(input.contactEmail?.trim() ? { contactEmail: input.contactEmail.trim() } : {}),
      ...(input.contactPhone?.trim() ? { contactPhone: input.contactPhone.trim() } : {}),
      ...(input.siteAddress?.trim() ? { siteAddress: input.siteAddress.trim() } : {}),
      ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    },
  });
  return result.ok ? { ok: true, reference: result.data.reference } : { ok: false, error: result.message };
}
