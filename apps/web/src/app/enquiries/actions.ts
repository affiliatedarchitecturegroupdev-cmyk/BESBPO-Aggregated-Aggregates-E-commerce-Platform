"use server";

import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const KINDS = ["PLANT_HIRE", "SITE_SERVICE", "BUSINESS_LINE", "JOB_PACK", "ESTIMATE", "PARTNER_APPLICATION"] as const;
const DETAIL_PREFIX = "d:";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

/**
 * Sends a plant-hire, service, job-pack, estimator or partner request to the
 * API as an enquiry. Fields named "d:<label>" are the form's own answers and
 * travel as `details`; a signed-in customer's enquiry is linked to their account.
 */
export async function sendEnquiry(_prev: FormState, form: FormData): Promise<FormState> {
  const kind = text(form, "kind");
  if (!(KINDS as readonly string[]).includes(kind)) return { error: "Something went wrong with this form — please refresh the page and try again." };
  if (form.get("consent") !== "on") return { error: "Please tick the box so we can use your details to reply." };
  const details: Record<string, string> = {};
  for (const [name, value] of form.entries()) {
    if (name.startsWith(DETAIL_PREFIX) && typeof value === "string" && value.trim()) details[name.slice(DETAIL_PREFIX.length)] = value.trim();
  }
  const result = await api<{ reference: string }>("/enquiries", {
    method: "POST",
    token: sessionToken(),
    body: {
      kind,
      subject: text(form, "subject"),
      sku: text(form, "sku") || null,
      details,
      contactName: text(form, "contactName"),
      contactEmail: text(form, "contactEmail"),
      contactPhone: text(form, "contactPhone") || null,
      companyName: text(form, "companyName") || null,
      province: text(form, "province") || null,
      siteAddress: text(form, "siteAddress") || null,
      message: text(form, "message") || null,
      website: text(form, "website"),
    },
  });
  if (!result.ok) return { error: result.message };
  if (kind === "PARTNER_APPLICATION") {
    return { success: `Thank you — your application is logged as ${result.data.reference}. We've emailed you a copy; our partnerships team will contact you about onboarding documents and rate cards.` };
  }
  return {
    success: `Thank you — your request is logged as ${result.data.reference}. We've emailed you a copy and our team will come back to you with availability and a written quote. Nothing is booked or charged until you accept it.`,
  };
}
