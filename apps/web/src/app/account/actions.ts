"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, apiUpload } from "@/lib/api";
import { endSession, safeReturnPath, sessionToken, startSession } from "@/lib/session";

export type FormState = { error?: string; success?: string } | null;

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const optional = (form: FormData, name: string) => text(form, name) || undefined;

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api<{ accessToken: string }>("/auth/login", {
    method: "POST",
    body: { email: text(form, "email"), password: form.get("password") },
  });
  if (!result.ok) return { error: result.status === 401 ? "Invalid email or password." : result.message };
  startSession(result.data.accessToken);
  redirect(safeReturnPath(form.get("next")));
}

export async function register(_prev: FormState, form: FormData): Promise<FormState> {
  if (form.get("password") !== form.get("confirmPassword")) return { error: "The passwords don't match." };
  const result = await api<{ accessToken: string }>("/auth/register", {
    method: "POST",
    body: { email: text(form, "email"), password: form.get("password"), name: optional(form, "name") },
  });
  if (!result.ok) return { error: result.message };
  startSession(result.data.accessToken);
  redirect(safeReturnPath(form.get("next")));
}

export async function logout() {
  endSession();
  redirect("/");
}

export async function applyForTradeAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api("/trade-accounts/apply", {
    method: "POST",
    token: sessionToken(),
    body: {
      companyName: text(form, "companyName"),
      registrationNumber: optional(form, "registrationNumber"),
      vatNumber: optional(form, "vatNumber"),
      contactPhone: optional(form, "contactPhone"),
      requestedTier: text(form, "requestedTier"),
      notes: optional(form, "notes"),
    },
  });
  if (!result.ok) return { error: result.message };
  redirect("/account/dashboard?applied=1");
}

export async function addDeliveryAddress(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api("/trade-accounts/me/addresses", {
    method: "POST",
    token: sessionToken(),
    body: {
      label: text(form, "label"),
      addressLine1: text(form, "addressLine1"),
      addressLine2: optional(form, "addressLine2"),
      city: text(form, "city"),
      province: text(form, "province"),
      postalCode: text(form, "postalCode"),
    },
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/account/dashboard");
  return { success: "Address saved." };
}

export async function removeDeliveryAddress(form: FormData) {
  await api(`/trade-accounts/me/addresses/${encodeURIComponent(text(form, "id"))}`, {
    method: "DELETE",
    token: sessionToken(),
  });
  revalidatePath("/account/dashboard");
}

export async function respondToQuote(form: FormData) {
  await api(`/quotes/${encodeURIComponent(text(form, "id"))}/respond`, {
    method: "POST",
    token: sessionToken(),
    body: { decision: text(form, "decision") },
  });
  revalidatePath("/account/dashboard");
}

// --- staff -------------------------------------------------------------------

export async function reviewApplication(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api(`/trade-accounts/applications/${encodeURIComponent(text(form, "companyId"))}/review`, {
    method: "POST",
    token: sessionToken(),
    body: { decision: text(form, "decision"), tier: optional(form, "tier"), notes: optional(form, "notes") },
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/account/staff");
  return { success: "Saved." };
}

export async function priceQuote(_prev: FormState, form: FormData): Promise<FormState> {
  const total = text(form, "quotedTotal");
  const status = text(form, "status");
  const result = await api(`/quotes/${encodeURIComponent(text(form, "id"))}`, {
    method: "PATCH",
    token: sessionToken(),
    body: {
      quotedTotal: total ? Number(total) : undefined,
      status: !total && status ? status : undefined,
      staffNotes: optional(form, "staffNotes"),
    },
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/account/staff");
  return { success: "Saved." };
}

// --- quote requests ----------------------------------------------------------

export type QuoteRequest = {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  companyName?: string;
  projectName?: string;
  deliveryAddress: string;
  deliveryProvince?: string;
  deliveryDistanceKm?: number;
  notes?: string;
  lines: { sku: string; unit: "ton" | "m3" | "bag"; quantity: number }[];
};

export async function submitQuoteRequest(
  request: QuoteRequest,
): Promise<{ ok: true; reference: string; reasons: string[] } | { ok: false; error: string }> {
  const result = await api<{ reference: string; reasons: string[] }>("/quotes", {
    method: "POST",
    token: sessionToken(),
    body: request,
  });
  if (!result.ok) return { ok: false, error: result.message };
  revalidatePath("/account/dashboard");
  return { ok: true, reference: result.data.reference, reasons: result.data.reasons };
}

// --- compliance documents (staff) --------------------------------------------

const UPLOAD_FIELDS = ["productSku", "documentType", "title", "standard", "batchReference", "issuedAt", "expiresAt", "orderNumber"];

export async function uploadComplianceDocument(_prev: FormState, form: FormData): Promise<FormState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF, PNG or JPEG file." };
  if (file.size > 10 * 1024 * 1024) return { error: "Files must be 10MB or smaller." };
  const upload = new FormData();
  for (const name of UPLOAD_FIELDS) {
    const value = text(form, name);
    if (value) upload.set(name, value);
  }
  upload.set("file", file, file.name);
  const result = await apiUpload<{ title: string }>("/compliance-documents", upload, sessionToken());
  if (!result.ok) return { error: result.message };
  revalidatePath("/account/staff");
  return { success: `Uploaded “${result.data.title}”.` };
}

export async function deleteComplianceDocument(form: FormData) {
  await api(`/compliance-documents/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/account/staff");
}
