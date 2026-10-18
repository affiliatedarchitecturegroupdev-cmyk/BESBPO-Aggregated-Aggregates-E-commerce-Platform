"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api, apiUpload } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

/** The buyer (or staff): save a phased delivery plan. `plan` is the drops as JSON. */
export async function saveDeliveryPlan(_prev: FormState, form: FormData): Promise<FormState> {
  const orderId = text(form, "orderId");
  let drops: unknown;
  try {
    drops = JSON.parse(text(form, "plan"));
  } catch {
    return { error: "Add the drops first." };
  }
  const result = await api(`/deliveries/orders/${encodeURIComponent(orderId)}/plan`, { method: "PUT", token: sessionToken(), body: { drops } });
  revalidatePath(`/orders/${orderId}/tracking`);
  revalidatePath(`/admin/orders/${orderId}/deliveries`);
  return result.ok ? { success: "Delivery plan saved. We'll confirm each date with the supplier, and email you as each drop leaves." } : { error: result.message };
}

export async function clearDeliveryPlan(_prev: FormState, form: FormData): Promise<FormState> {
  const orderId = text(form, "orderId");
  const result = await api(`/deliveries/orders/${encodeURIComponent(orderId)}/plan`, { method: "DELETE", token: sessionToken() });
  revalidatePath(`/orders/${orderId}/tracking`);
  revalidatePath(`/admin/orders/${orderId}/deliveries`);
  return result.ok ? { success: "Back to a single delivery." } : { error: result.message };
}

/** The driver's phone (no sign-in): the receiver signs for the delivery. */
export async function captureProof(_prev: FormState, form: FormData): Promise<FormState> {
  const token = text(form, "token");
  const upload = new FormData();
  for (const name of ["receivedBy", "exceptions", "latitude", "longitude"]) if (text(form, name)) upload.set(name, text(form, name));
  const signature = text(form, "signature");
  const match = signature.match(/^data:image\/png;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return { error: "Ask the receiver to sign in the box." };
  upload.set("signature", new Blob([Buffer.from(match[1], "base64")], { type: "image/png" }), "signature.png");
  const photo = form.get("photo");
  if (photo instanceof File && photo.size > 0) upload.set("photo", photo, photo.name || "photo.jpg");
  // No revalidation here: the link is now used, and re-rendering the page would replace this confirmation with "link not valid".
  const result = await apiUpload<{ receivedBy: string }>(`/pod/${encodeURIComponent(token)}`, upload, null);
  return result.ok ? { success: `Signed for by ${result.data.receivedBy} — thank you. The customer has been emailed, and this link is now closed.` } : { error: result.message };
}
