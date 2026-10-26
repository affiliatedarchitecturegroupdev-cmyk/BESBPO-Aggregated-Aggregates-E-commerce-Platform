"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { api } from "@/lib/api";
import { FLATBED_LINES } from "@/lib/delivery-rates";
import { sessionToken } from "@/lib/session";

export type RatesFormState = { error?: string; success?: string } | null;

const SIZES = ["M3_6", "M3_10", "M3_14_PLUS"] as const;

/** Admin: the standard delivery rates and flatbed fees (docs/delivery-rates.md). */
export async function saveDeliveryRates(_: RatesFormState, form: FormData): Promise<RatesFormState> {
  const value = (name: string) => String(form.get(name) ?? "").trim();
  const flatbed: Record<string, { fees: string[]; freeFrom: string | null }> = {};
  for (const line of FLATBED_LINES) {
    if (form.get(`${line}.enabled`) !== "on") continue;
    flatbed[line] = { fees: [0, 1, 2].map((i) => value(`${line}.fee${i}`)), freeFrom: value(`${line}.freeFrom`) || null };
  }
  const result = await api("/pricing/delivery-rates", {
    method: "PUT",
    token: sessionToken(),
    body: {
      bandFees: Object.fromEntries(["BAND_30_60", "BAND_60_100"].map((b) => [b, Object.fromEntries(SIZES.map((s) => [s, value(`${b}.${s}`)]))])),
      smallLoadFee: value("smallLoadFee"),
      baggedFee: value("baggedFee"),
      baggedFreeFromKg: value("baggedFreeFromKg"),
      minBulkM3: value("minBulkM3"),
      minBulkTons: value("minBulkTons"),
      flatbed,
    },
  });
  if (!result.ok) return { error: result.message };
  revalidateTag("delivery-rates");
  revalidatePath("/", "layout");
  return { success: "Saved — new carts, checkouts and quotations use these rates now. Orders already placed keep theirs." };
}
