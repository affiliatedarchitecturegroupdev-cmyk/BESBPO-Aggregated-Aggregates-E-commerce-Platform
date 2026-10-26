"use server";

import { api } from "@/lib/api";
import type { Estimate, ProjectPackage } from "@/lib/projects";
import { sessionToken } from "@/lib/session";

/** The instant take-off for a design-and-build brief — quantities only (docs/projects.md). */
export async function estimateProject(pkg: ProjectPackage, brief: object): Promise<{ ok: true; estimate: Estimate } | { ok: false; error: string }> {
  const result = await api<Estimate>("/projects/estimate", { method: "POST", body: { package: pkg, brief } });
  return result.ok ? { ok: true, estimate: result.data } : { ok: false, error: result.message };
}

/** Sends the brief; signed-in clients' contact details come from their account. */
export async function sendProjectBrief(input: {
  pkg: ProjectPackage;
  brief: object;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  siteAddress?: string;
  province: string;
  notes?: string;
  privacyAccepted: boolean;
}): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  const optional = (key: string, value?: string) => (value?.trim() ? { [key]: value.trim() } : {});
  const result = await api<{ reference: string }>("/projects", {
    method: "POST",
    token: sessionToken(),
    body: {
      package: input.pkg,
      brief: input.brief,
      province: input.province,
      privacyAccepted: input.privacyAccepted,
      ...optional("contactName", input.contactName),
      ...optional("contactEmail", input.contactEmail),
      ...optional("contactPhone", input.contactPhone),
      ...optional("siteAddress", input.siteAddress),
      ...optional("notes", input.notes),
    },
  });
  return result.ok ? { ok: true, reference: result.data.reference } : { ok: false, error: result.message };
}
