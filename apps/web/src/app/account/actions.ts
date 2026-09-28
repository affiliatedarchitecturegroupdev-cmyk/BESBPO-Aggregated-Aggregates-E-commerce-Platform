"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, apiUpload } from "@/lib/api";
import { endSession, safeReturnPath, sessionToken, startSession } from "@/lib/session";
import type { ImportSummary } from "@/lib/suppliers";

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
  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin", "layout");
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
  revalidatePath("/admin", "layout");
  return { success: `Uploaded “${result.data.title}”.` };
}

export async function deleteComplianceDocument(form: FormData) {
  await api(`/compliance-documents/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/admin", "layout");
}

// --- CMS: products and site content (staff) -----------------------------------

/**
 * CMS edits change public pages: mark every cached page stale, not just the
 * admin. Most pages update on the next visit; statically cached ones can
 * serve one stale copy first, and all of them refresh within 60 seconds.
 * (The API refuses hidden products on quotes and orders regardless.)
 */
function revalidateStorefront() {
  revalidatePath("/", "layout");
}

export async function updateProductMerchandising(_prev: FormState, form: FormData): Promise<FormState> {
  const rank = text(form, "featuredRank");
  const result = await api(`/merchandising/products/${encodeURIComponent(text(form, "sku"))}`, {
    method: "PATCH",
    token: sessionToken(),
    body: {
      description: text(form, "description"),
      isActive: form.get("isActive") === "on",
      featuredRank: rank ? Number(rank) : null,
    },
  });
  if (!result.ok) return { error: result.message };
  revalidateStorefront();
  return { success: "Saved — live on the storefront within a minute." };
}

export async function uploadProductImage(_prev: FormState, form: FormData): Promise<FormState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PNG, JPEG or WebP image." };
  if (file.size > 5 * 1024 * 1024) return { error: "Images must be 5MB or smaller." };
  const upload = new FormData();
  const altText = text(form, "altText");
  if (altText) upload.set("altText", altText);
  upload.set("file", file, file.name);
  const result = await apiUpload(`/merchandising/products/${encodeURIComponent(text(form, "sku"))}/images`, upload, sessionToken());
  if (!result.ok) return { error: result.message };
  revalidateStorefront();
  return { success: "Photo added." };
}

export async function deleteProductImage(form: FormData) {
  await api(`/merchandising/images/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidateStorefront();
}

const link = (form: FormData, prefix: string) => ({ label: text(form, `${prefix}Label`), href: text(form, `${prefix}Href`) });

export async function saveSiteContent(_prev: FormState, form: FormData): Promise<FormState> {
  const key = text(form, "key");
  let body: unknown;
  if (key === "announcement") {
    const linkLabel = text(form, "linkLabel");
    body = {
      enabled: form.get("enabled") === "on",
      message: text(form, "message"),
      ...(linkLabel ? { link: link(form, "link") } : {}),
    };
  } else if (key === "hero") {
    body = {
      eyebrow: text(form, "eyebrow"),
      headline: text(form, "headline"),
      body: text(form, "body"),
      primaryCta: link(form, "primary"),
      secondaryCta: link(form, "secondary"),
    };
  } else if (key === "promo") {
    body = { title: text(form, "title"), body: text(form, "body"), cta: link(form, "cta") };
  } else {
    return { error: "Unknown content block." };
  }
  const result = await api(`/content/${key}`, { method: "PUT", token: sessionToken(), body });
  if (!result.ok) return { error: result.message };
  revalidateStorefront();
  return { success: "Published — live on the storefront within a minute." };
}

// --- supplier network (staff) ------------------------------------------------

/** The public delivery-areas page and calculator read supplier coverage. */
function revalidateSupplierNetwork() {
  revalidatePath("/admin", "layout");
  revalidatePath("/delivery-areas");
}

export type SupplierImportState = { error?: string; summary?: ImportSummary } | null;

export async function importSuppliers(_prev: SupplierImportState, form: FormData): Promise<SupplierImportState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose the supplier database CSV." };
  if (file.size > 2 * 1024 * 1024) return { error: "The CSV must be 2MB or smaller." };
  const upload = new FormData();
  upload.set("activateLaunchProvincesOnly", form.get("activateLaunchProvincesOnly") === "on" ? "true" : "false");
  upload.set("file", file, file.name);
  const result = await apiUpload<ImportSummary>("/suppliers/import", upload, sessionToken());
  if (!result.ok) return { error: result.message };
  if (result.data.errors.length === 0) revalidateSupplierNetwork();
  return { summary: result.data };
}

function supplierBody(form: FormData) {
  const lat = text(form, "latitude");
  const lng = text(form, "longitude");
  return {
    externalId: text(form, "externalId"),
    name: text(form, "name"),
    tier: text(form, "tier"),
    province: text(form, "province"),
    city: text(form, "city"),
    address: text(form, "address"),
    latitude: lat ? Number(lat) : null,
    longitude: lng ? Number(lng) : null,
    categorySlugs: form.getAll("categorySlugs").filter((v): v is string => typeof v === "string"),
    productNotes: text(form, "productNotes"),
    contactName: text(form, "contactName"),
    contactPhone: text(form, "contactPhone"),
    isActive: form.get("isActive") === "on",
  };
}

export async function saveSupplier(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const body = supplierBody(form);
  if (body.categorySlugs.length === 0) return { error: "Tick at least one material category." };
  const result = await api<{ id: string }>(id ? `/suppliers/${encodeURIComponent(id)}` : "/suppliers", {
    method: id ? "PUT" : "POST",
    token: sessionToken(),
    body,
  });
  if (!result.ok) return { error: result.message };
  revalidateSupplierNetwork();
  if (!id) redirect(`/admin/suppliers/${result.data.id}?created=1`);
  return { success: "Saved — the delivery-areas page updates within a minute." };
}

export async function deleteSupplier(form: FormData) {
  await api(`/suppliers/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidateSupplierNetwork();
  redirect("/admin/suppliers");
}
