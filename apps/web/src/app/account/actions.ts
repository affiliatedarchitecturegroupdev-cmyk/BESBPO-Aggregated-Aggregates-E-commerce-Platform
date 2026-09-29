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
  whatsappUpdates?: boolean;
  companyName?: string;
  projectName?: string;
  deliveryAddress: string;
  deliveryProvince?: string;
  deliveryDistanceKm?: number;
  notes?: string;
  /** ton / m3 / bag for aggregates; a packaged unit (BAG_50KG, DRUM_210L…) for cement, grout and admixtures. */
  lines: { sku: string; unit: string; quantity: number }[];
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
  } else if (key === "slideshow") {
    const rows = form.getAll("slideImage").map((imageId, i) => ({
      imageId: String(imageId),
      caption: String(form.getAll("slideCaption")[i] ?? "").trim(),
      href: String(form.getAll("slideHref")[i] ?? "").trim(),
      order: Number(form.getAll("slideOrder")[i] ?? i),
      enabled: form.getAll("slideEnabled").includes(String(i)),
    }));
    const slides = rows
      .filter((row) => row.imageId && row.caption)
      .sort((a, b) => a.order - b.order)
      .map(({ imageId, caption, href, enabled }) => ({ imageId, caption, enabled, ...(href ? { href } : {}) }));
    if (slides.length === 0) return { error: "Keep at least one slide (a photo and a caption)." };
    body = { enabled: form.get("enabled") === "on", intervalSeconds: Number(text(form, "intervalSeconds")), slides };
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
    isVerifiedPartner: form.get("isVerifiedPartner") === "on",
    sourceUrl: text(form, "sourceUrl"),
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

// --- payments -----------------------------------------------------------------

/** Starts paying an order with the chosen method; the API re-checks eligibility and routes it to its gateway. */
export async function payForOrder(orderId: string, methodKey: string): Promise<{ ok: boolean; message: string; redirectUrl?: string }> {
  const result = await api<{ isLive: boolean; note: string; redirectUrl?: string }>("/payment-methods/initiate", {
    method: "POST",
    token: sessionToken(),
    body: { orderId, methodKey },
  });
  if (!result.ok) return { ok: false, message: result.message };
  const redirect = result.data.redirectUrl && /^https:\/\//.test(result.data.redirectUrl) ? result.data.redirectUrl : undefined;
  return { ok: result.data.isLive, message: result.data.note, redirectUrl: redirect };
}

// --- ad system: promotions (staff) --------------------------------------------

export async function savePromotion(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  // Dates are South African days: a promotion runs from the start of its first day to the end of its last.
  const day = (name: string, time: string) => (text(form, name) ? new Date(`${text(form, name)}T${time}+02:00`).toISOString() : null);
  const result = await api(id ? `/promotions/${encodeURIComponent(id)}` : "/promotions", {
    method: id ? "PUT" : "POST",
    token: sessionToken(),
    body: {
      slot: text(form, "slot"),
      title: text(form, "title"),
      imageUrl: text(form, "imageUrl"),
      linkUrl: text(form, "linkUrl") || null,
      startsAt: day("startsAt", "00:00:00"),
      endsAt: day("endsAt", "23:59:59"),
      isActive: form.get("isActive") === "on",
      sortOrder: Number(text(form, "sortOrder") || 0),
      categorySlug: text(form, "target").startsWith("category:") ? text(form, "target").slice("category:".length) : null,
      industrySlug: text(form, "target").startsWith("industry:") ? text(form, "target").slice("industry:".length) : null,
    },
  });
  if (!result.ok) return { error: result.message };
  revalidateStorefront();
  return { success: id ? "Saved — live within a minute." : "Promotion added." };
}

export async function uploadMedia(_prev: FormState, form: FormData): Promise<FormState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PNG, JPEG or WebP image." };
  if (file.size > 5 * 1024 * 1024) return { error: "Images must be 5MB or smaller." };
  const upload = new FormData();
  upload.set("label", text(form, "label"));
  upload.set("file", file, file.name);
  const result = await apiUpload<{ id: string }>("/media", upload, sessionToken());
  if (!result.ok) return { error: result.message };
  revalidatePath("/admin", "layout");
  return { success: `Uploaded — use it as upload:${result.data.id}` };
}

export async function deleteMedia(form: FormData) {
  await api(`/media/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/admin", "layout");
}

export async function deletePromotion(form: FormData) {
  await api(`/promotions/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidateStorefront();
}

// --- blog (staff) -----------------------------------------------------------------

export async function saveBlogPost(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await api<{ id: string }>(id ? `/blog/admin/posts/${encodeURIComponent(id)}` : "/blog/admin/posts", {
    method: id ? "PUT" : "POST",
    token: sessionToken(),
    body: {
      slug: text(form, "slug"),
      title: text(form, "title"),
      excerpt: text(form, "excerpt"),
      bodyMarkdown: String(form.get("bodyMarkdown") ?? ""),
      coverImageUrl: text(form, "coverImageUrl") || null,
      categorySlug: text(form, "categorySlug") || null,
      authorName: text(form, "authorName"),
      isPublished: form.get("isPublished") === "on",
    },
  });
  if (!result.ok) return { error: result.message };
  revalidateStorefront();
  if (!id) redirect(`/admin/blog/${result.data.id}?created=1`);
  return { success: form.get("isPublished") === "on" ? "Published — live within a minute." : "Saved as a draft." };
}

export async function deleteBlogPost(form: FormData) {
  await api(`/blog/admin/posts/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidateStorefront();
  redirect("/admin/blog");
}

export async function createBlogCategory(_prev: FormState, form: FormData): Promise<FormState> {
  const name = text(form, "name");
  const slug = name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const result = await api("/blog/categories", { method: "POST", token: sessionToken(), body: { slug, name } });
  if (!result.ok) return { error: result.message };
  revalidatePath("/admin", "layout");
  return { success: `Category “${name}” added.` };
}

// --- payment routing (admin) ------------------------------------------------------

export async function updatePaymentRouting(_prev: FormState, form: FormData): Promise<FormState> {
  const numberOrNull = (name: string) => (text(form, name) === "" ? null : Number(text(form, name)));
  const result = await api(`/payment-methods/${encodeURIComponent(text(form, "methodKey"))}`, {
    method: "PUT",
    token: sessionToken(),
    body: {
      activeGateway: text(form, "activeGateway"),
      fallbackGateway: text(form, "fallbackGateway") || null,
      minOrderValue: numberOrNull("minOrderValue"),
      maxOrderValue: numberOrNull("maxOrderValue"),
      isEnabled: form.get("isEnabled") === "on",
    },
  });
  if (!result.ok) return { error: result.status === 403 ? "Only admins can change payment routing." : result.message };
  revalidateStorefront();
  return { success: "Routing saved — takes effect on the next payment." };
}

// --- WhatsApp chats (staff) -------------------------------------------------------

export async function closeWhatsAppConversation(form: FormData) {
  await api(`/channels/whatsapp/conversations/${encodeURIComponent(text(form, "id"))}/close`, {
    method: "POST",
    token: sessionToken(),
    body: { state: text(form, "state") },
  });
  revalidatePath("/admin", "layout");
}

// --- cart & checkout ------------------------------------------------------------

export type CartPricing = {
  customer_tier: string;
  is_quote_only: boolean;
  reasons: string[];
  lines: { sku: string; unit: string; quantity: number; unit_price: number | null; total: number | null; pricing_status?: string }[];
  subtotal: number;
  delivery: { fee: number | null; load_size: string | null };
  total: number | null;
  distance: { distanceKm: number; source: "LOCATION" | "CUSTOMER"; fromTown: string | null; fromProvince: string | null };
};

type CartInput = {
  lines: { sku: string; unit: string; quantity: number }[];
  delivery: { latitude: number; longitude: number } | { distanceKm: number };
};

function deliveryBody(delivery: CartInput["delivery"]) {
  return "distanceKm" in delivery
    ? { deliveryDistanceKm: delivery.distanceKm }
    : { deliveryLatitude: delivery.latitude, deliveryLongitude: delivery.longitude };
}

/** Prices the cart at the shopper's own tier (Retail when signed out). Nothing is saved. */
export async function priceCart(input: CartInput): Promise<{ ok: true; pricing: CartPricing } | { ok: false; error: string }> {
  const result = await api<CartPricing>("/orders/price", {
    method: "POST",
    token: sessionToken(),
    body: { lines: input.lines, ...deliveryBody(input.delivery) },
  });
  return result.ok ? { ok: true, pricing: result.data } : { ok: false, error: result.message };
}

/** Places the order; the API re-prices everything and refuses quote-only carts. */
export async function placeOrder(
  input: CartInput & { deliveryAddress: string; deliveryProvince: string; contactPhone?: string; whatsappUpdates?: boolean; notes?: string },
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  const result = await api<{ id: string }>("/orders", {
    method: "POST",
    token: sessionToken(),
    body: {
      lines: input.lines,
      ...deliveryBody(input.delivery),
      deliveryAddress: input.deliveryAddress,
      deliveryProvince: input.deliveryProvince,
      contactPhone: input.contactPhone || undefined,
      whatsappUpdates: input.whatsappUpdates || undefined,
      notes: input.notes || undefined,
    },
  });
  if (!result.ok) return { ok: false, error: result.status === 401 ? "Please sign in again to place your order." : result.message };
  revalidatePath("/account/dashboard");
  return { ok: true, orderId: result.data.id };
}

// --- orders (staff) ---------------------------------------------------------------

export async function updateOrderStatus(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api(`/orders/${encodeURIComponent(text(form, "id"))}/status`, {
    method: "PATCH",
    token: sessionToken(),
    body: {
      status: text(form, "status"),
      carrier: optional(form, "carrier"),
      externalPartnerName: optional(form, "externalPartnerName"),
      trackingRef: optional(form, "trackingRef"),
    },
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/admin", "layout");
  return { success: "Order updated." };
}

// --- notifications (staff view; admins change settings) ---------------------------

const NOTIFICATION_CHANNEL_KEYS = ["customerEmail", "customerWhatsApp", "staffEmail"] as const;

export async function updateNotificationSetting(_prev: FormState, form: FormData): Promise<FormState> {
  // Only the channels an event can use are posted as "available"; the rest stay untouched.
  const available = form.getAll("available").map(String);
  const body = Object.fromEntries(NOTIFICATION_CHANNEL_KEYS.filter((k) => available.includes(k)).map((k) => [k, form.get(k) === "on"]));
  const result = await api(`/notifications/settings/${encodeURIComponent(text(form, "event"))}`, { method: "PUT", token: sessionToken(), body });
  if (!result.ok) return { error: result.status === 403 ? "Only admins can change notification settings." : result.message };
  revalidatePath("/admin/notifications");
  return { success: "Saved." };
}

export async function addNotificationRecipient(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api("/notifications/recipients", { method: "POST", token: sessionToken(), body: { email: text(form, "email") } });
  if (!result.ok) return { error: result.status === 403 ? "Only admins can change staff recipients." : result.message };
  revalidatePath("/admin/notifications");
  return { success: "Added — staff alerts go to this inbox from now on." };
}

export async function removeNotificationRecipient(form: FormData) {
  await api(`/notifications/recipients/${encodeURIComponent(text(form, "email"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/admin/notifications");
}

export async function sendTestEmail(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api<{ delivered: boolean; logged?: boolean; error?: string }>("/notifications/test", {
    method: "POST",
    token: sessionToken(),
    body: { email: text(form, "email") },
  });
  if (!result.ok) return { error: result.status === 403 ? "Only admins can send test emails." : result.message };
  if (result.data.delivered) return { success: "Test email sent — check the inbox (and spam folder)." };
  if (result.data.logged) return { error: "No email provider is configured yet, so the test was only logged. See the set-up notes above." };
  return { error: `The provider rejected the test email: ${result.data.error ?? "unknown error"}` };
}

export async function resendNotification(form: FormData) {
  await api(`/notifications/${encodeURIComponent(text(form, "id"))}/resend`, { method: "POST", token: sessionToken() });
  revalidatePath("/admin/notifications");
}

// --- account settings -------------------------------------------------------------

export async function updateProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api("/account/profile", { method: "PATCH", token: sessionToken(), body: { name: text(form, "name") } });
  if (!result.ok) return { error: result.message };
  revalidatePath("/account", "layout");
  return { success: "Name saved." };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const newPassword = text(form, "newPassword");
  if (newPassword !== text(form, "confirmPassword")) return { error: "The new passwords don't match." };
  const result = await api("/account/password", {
    method: "POST",
    token: sessionToken(),
    body: { currentPassword: text(form, "currentPassword") || undefined, newPassword },
  });
  if (!result.ok) return { error: result.status === 400 && /least 10/.test(result.message) ? "Use at least 10 characters." : result.message };
  return { success: "Password changed. Use it next time you sign in." };
}

export async function addSavedAddress(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api("/account/addresses", {
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
  revalidatePath("/account", "layout");
  return { success: "Delivery site saved — it's offered at checkout." };
}

export async function setDefaultAddress(form: FormData) {
  await api(`/account/addresses/${encodeURIComponent(text(form, "id"))}/default`, { method: "POST", token: sessionToken() });
  revalidatePath("/account", "layout");
}

export async function removeSavedAddress(form: FormData) {
  await api(`/account/addresses/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath("/account", "layout");
}

// --- tax invoices (staff) ---------------------------------------------------------

export async function issueInvoice(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api<{ invoiceNumber: string }>(`/orders/${encodeURIComponent(text(form, "id"))}/invoice`, { method: "POST", token: sessionToken() });
  if (!result.ok) return { error: result.message };
  revalidatePath("/admin/orders");
  return { success: `Tax invoice ${result.data.invoiceNumber} issued — the buyer can download it from their order.` };
}
