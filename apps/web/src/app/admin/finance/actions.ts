"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/app/account/actions";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

function refresh() {
  revalidatePath("/admin", "layout");
}

/** Staff and admins: record a refund paid back by EFT for an order or a booking. */
export async function recordRefund(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api("/finance/refunds", {
    method: "POST",
    token: sessionToken(),
    body: {
      orderId: text(form, "orderId") || null,
      bookingId: text(form, "bookingId") || null,
      amount: Number(text(form, "amount")),
      reason: text(form, "reason"),
      reference: text(form, "reference") || null,
      refundedOn: text(form, "refundedOn") || null,
    },
  });
  refresh();
  return result.ok ? { success: "Refund recorded." } : { error: result.message };
}

export async function deleteRefund(form: FormData) {
  await api(`/finance/refunds/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  refresh();
}

/** Admins: include or exclude an order or booking from reporting. */
export async function setTestFlag(form: FormData) {
  const kind = text(form, "kind") === "booking" ? "bookings" : "orders";
  await api(`/finance/${kind}/${encodeURIComponent(text(form, "id"))}/test`, { method: "PATCH", token: sessionToken(), body: { isTest: text(form, "isTest") === "true" } });
  refresh();
}

/** Admins: save the standard delivery-cost grid (blank cell = no rate). */
export async function saveDeliveryRates(_prev: FormState, form: FormData): Promise<FormState> {
  const rates = [...form.entries()]
    .filter(([name]) => name.startsWith("rate:"))
    .map(([name, value]) => {
      const [, carrier, bandLabel, load] = name.split(":");
      const raw = String(value).trim();
      return { carrier, bandLabel, load, costExVat: raw === "" ? null : Number(raw) };
    });
  const result = await api("/finance/delivery-rates", { method: "PUT", token: sessionToken(), body: { rates } });
  refresh();
  return result.ok ? { success: "Standard delivery costs saved — they apply to deliveries dispatched from now on." } : { error: result.message };
}

export async function saveOperatingCost(_prev: FormState, form: FormData): Promise<FormState> {
  const id = text(form, "id");
  const result = await api(id ? `/finance/operating-costs/${encodeURIComponent(id)}` : "/finance/operating-costs", {
    method: id ? "PATCH" : "POST",
    token: sessionToken(),
    body: { month: text(form, "month"), category: text(form, "category"), description: text(form, "description"), amountExVat: Number(text(form, "amountExVat")) },
  });
  refresh();
  return result.ok ? { success: id ? "Saved." : "Cost added." } : { error: result.message };
}

export async function deleteOperatingCost(form: FormData) {
  await api(`/finance/operating-costs/${encodeURIComponent(text(form, "id"))}`, { method: "DELETE", token: sessionToken() });
  refresh();
}
