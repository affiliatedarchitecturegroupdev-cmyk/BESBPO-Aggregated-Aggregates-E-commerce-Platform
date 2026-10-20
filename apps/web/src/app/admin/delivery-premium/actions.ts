"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

export type DdpFormState = { error?: string; success?: string } | null;

/** Admin: the Distributed Delivery Premium's rates (docs/delivery-premium.md). */
export async function saveDdpPolicy(_: DdpFormState, form: FormData): Promise<DdpFormState> {
  const number = (name: string) => Number(String(form.get(name) ?? "").trim());
  const result = await api("/orders/delivery-premium/policy", {
    method: "PUT",
    token: sessionToken(),
    body: {
      enabled: form.get("enabled") === "on",
      minProducts: number("minProducts"),
      twoOriginFee: number("twoOriginFee"),
      threeOriginFee: number("threeOriginFee"),
      extraOriginFee: number("extraOriginFee"),
      heavyPerTon: number("heavyPerTon"),
    },
  });
  if (!result.ok) return { error: result.message };
  revalidatePath("/admin/delivery-premium");
  return { success: "Saved — new carts and orders use these rates now. Orders already placed keep theirs." };
}
