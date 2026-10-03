"use server";

import { apiUpload } from "@/lib/api";
import type { FormState } from "@/app/account/actions";

/** Sends an application (with the CV file) to the API. Works for a vacancy or the talent pool. */
export async function applyForJob(_prev: FormState, form: FormData): Promise<FormState> {
  const cv = form.get("cv");
  if (!(cv instanceof File) || cv.size === 0) return { error: "Attach your CV (PDF or Word, up to 5 MB)." };
  if (cv.size > 5 * 1024 * 1024) return { error: "Your CV is larger than 5 MB — please send a smaller file." };
  const body = new FormData();
  for (const name of ["vacancyId", "fullName", "email", "phone", "province", "town", "linkedinUrl", "coverNote", "website"]) {
    const value = form.get(name);
    if (typeof value === "string") body.set(name, value);
  }
  body.set("consent", form.get("consent") === "on" ? "yes" : "no");
  body.set("cv", cv, cv.name);
  const result = await apiUpload<{ id: string }>("/careers/applications", body, null);
  if (!result.ok) return { error: result.message };
  return { success: "Thank you — your application has been received. We'll contact you if you're shortlisted." };
}
