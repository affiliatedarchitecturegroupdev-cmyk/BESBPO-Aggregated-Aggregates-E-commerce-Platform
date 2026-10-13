"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";
import { REVIEWS_TAG } from "@/lib/reviews";
import { sessionToken } from "@/lib/session";

/** Staff: publish or hide a review (PRODUCT_REVIEWS.md). */
export async function moderateReview(form: FormData) {
  const id = String(form.get("id") ?? "");
  const status = form.get("status") === "HIDDEN" ? "HIDDEN" : "PUBLISHED";
  const reason = String(form.get("reason") ?? "").trim().slice(0, 300);
  if (!/^[a-z0-9]{10,40}$/.test(id)) return;
  await api(`/reviews/staff/${id}`, { method: "PATCH", token: sessionToken(), body: { status, ...(reason ? { reason } : {}) } });
  revalidateTag(REVIEWS_TAG);
  revalidatePath("/admin/reviews");
}
