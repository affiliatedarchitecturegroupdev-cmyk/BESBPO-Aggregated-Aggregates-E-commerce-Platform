"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";
import { REVIEWS_TAG } from "@/lib/reviews";
import { sessionToken } from "@/lib/session";

export type MyReview = {
  signedIn: boolean;
  review: { rating: number; title: string | null; body: string | null; status: "PUBLISHED" | "HIDDEN"; hiddenReason: string | null } | null;
  canWrite: boolean;
  purchase: { orderNumber: string; paidAt: string } | null;
};

const SKU = /^[A-Za-z0-9-]{2,60}$/;

/** The signed-in customer's review of a product and whether they can write one (PRODUCT_REVIEWS.md). */
export async function loadMyReview(sku: string): Promise<MyReview> {
  const token = sessionToken();
  if (!token || !SKU.test(sku)) return { signedIn: false, review: null, canWrite: false, purchase: null };
  const result = await api<Omit<MyReview, "signedIn">>(`/reviews/products/${sku}/mine`, { token });
  if (!result.ok) return { signedIn: result.status !== 401, review: null, canWrite: false, purchase: null };
  return { signedIn: true, ...result.data };
}

export async function saveMyReview(sku: string, slug: string, input: { rating: number; title?: string; body?: string }): Promise<{ error?: string; success?: string }> {
  const token = sessionToken();
  if (!token) return { error: "Sign in to rate this product." };
  if (!SKU.test(sku)) return { error: "Unknown product." };
  const body = { rating: input.rating, ...(input.title?.trim() ? { title: input.title.trim() } : {}), ...(input.body?.trim() ? { body: input.body.trim() } : {}) };
  const result = await api<{ contactDetailsRemoved: boolean; status: string }>(`/reviews/products/${sku}/mine`, { method: "PUT", token, body });
  if (!result.ok) return { error: result.message };
  revalidateTag(REVIEWS_TAG);
  revalidatePath(`/products/${slug}`);
  const note = result.data.contactDetailsRemoved ? " Contact details were removed — reviews can't include phone numbers, emails or links." : "";
  return { success: (body.body ? "Thanks — your review is published." : "Thanks — your rating is saved.") + note };
}

export async function deleteMyReview(sku: string, slug: string): Promise<{ error?: string; success?: string }> {
  const token = sessionToken();
  if (!token || !SKU.test(sku)) return { error: "Sign in first." };
  const result = await api(`/reviews/products/${sku}/mine`, { method: "DELETE", token });
  if (!result.ok) return { error: result.message };
  revalidateTag(REVIEWS_TAG);
  revalidatePath(`/products/${slug}`);
  return { success: "Your rating and review were removed." };
}
