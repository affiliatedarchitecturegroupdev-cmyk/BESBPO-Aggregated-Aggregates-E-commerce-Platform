"use server";

import type { FormState } from "@/app/account/actions";
import { apiUpload } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** Sends a bar bending schedule (rows as JSON, plus an optional file) to the API. */
export async function submitSchedule(_prev: FormState, form: FormData): Promise<FormState> {
  const file = form.get("file");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && file.size > MAX_FILE_BYTES) return { error: "The schedule file is larger than 10 MB — please send a smaller file." };
  const body = new FormData();
  for (const name of ["contactName", "contactEmail", "contactPhone", "companyName", "projectName", "province", "siteAddress", "requiredBy", "message", "lines", "website"]) {
    const value = form.get(name);
    if (typeof value === "string") body.set(name, value);
  }
  if (hasFile) body.set("file", file, file.name);
  const result = await apiUpload<{ id: string; reference: string; totalMassKg: number }>("/cut-and-bend", body, sessionToken());
  if (!result.ok) return { error: result.message };
  return {
    success: `Thank you — your schedule is logged as ${result.data.reference}. We'll price it with the merchant and email you a written quote; nothing is cut or charged until you accept it.`,
  };
}
