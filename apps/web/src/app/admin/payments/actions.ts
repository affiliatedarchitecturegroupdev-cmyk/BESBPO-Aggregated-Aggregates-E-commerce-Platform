"use server";

import { revalidatePath } from "next/cache";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";

type FormState = { error?: string; success?: string } | null;

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};
const denied = (status: number, who = "staff") => (status === 403 ? `Only ${who} can do this.` : null);

/** Admin: stop sending payments to a gateway (its methods use their fallback). */
export async function pauseGateway(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api(`/payment-methods/gateways/${encodeURIComponent(text(form, "gateway"))}/pause`, { method: "POST", token: sessionToken(), body: { reason: text(form, "reason") } });
  if (!result.ok) return { error: denied(result.status, "admins") ?? result.message };
  revalidatePath("/admin/payments");
  return { success: "Paused — new payments for its methods go to their fallback." };
}

export async function resumeGateway(_prev: FormState, form: FormData): Promise<FormState> {
  const result = await api(`/payment-methods/gateways/${encodeURIComponent(text(form, "gateway"))}/resume`, { method: "POST", token: sessionToken() });
  if (!result.ok) return { error: denied(result.status, "admins") ?? result.message };
  revalidatePath("/admin/payments");
  return { success: "Resumed." };
}

/** Staff: check lay-by plans and unconfirmed payments with the gateways now. */
export async function syncPayments(_prev: FormState): Promise<FormState> {
  const result = await api<{ checked: number; expired: number }>("/payment-methods/sync", { method: "POST", token: sessionToken() });
  if (!result.ok) return { error: denied(result.status) ?? result.message };
  revalidatePath("/admin/payments");
  return { success: `Checked ${result.data.checked} payment${result.data.checked === 1 ? "" : "s"} with the gateways${result.data.expired ? `; ${result.data.expired} abandoned` : ""}.` };
}

/** Admin: the deposit policy. Steps are "from total = percent" rows; blank rows are ignored. */
export async function saveDepositPolicy(_prev: FormState, form: FormData): Promise<FormState> {
  const steps = (prefix: string) =>
    [0, 1, 2, 3]
      .map((i) => ({ fromTotal: text(form, `${prefix}From${i}`), percent: text(form, `${prefix}Pct${i}`) }))
      .filter((s) => s.percent !== "")
      .map((s) => ({ fromTotal: Number(s.fromTotal || 0), percent: Number(s.percent) }));
  const retail = steps("retail");
  const trade = steps("trade");
  if (!retail.length || !trade.length) return { error: "Give at least one retail and one trade step." };
  const result = await api("/payment-methods/deposit-policy", {
    method: "PUT",
    token: sessionToken(),
    body: { minOrderTotal: Number(text(form, "minOrderTotal") || 0), retail, trade, madeToOrderPercent: Number(text(form, "madeToOrderPercent")) },
  });
  if (!result.ok) return { error: denied(result.status, "admins") ?? result.message };
  revalidatePath("/admin/payments");
  return { success: "Deposit policy saved — it applies to orders from now on." };
}

/** Staff: money received by EFT, recorded on the order's ledger. */
export async function recordPayment(_prev: FormState, form: FormData): Promise<FormState> {
  const orderId = text(form, "orderId");
  const result = await api(`/payments/orders/${encodeURIComponent(orderId)}/record`, {
    method: "POST",
    token: sessionToken(),
    body: { amount: Number(text(form, "amount")), reference: text(form, "reference") || undefined, ...(text(form, "methodKey") ? { methodKey: text(form, "methodKey") } : {}) },
  });
  if (!result.ok) return { error: denied(result.status) ?? result.message };
  revalidatePath(`/admin/orders/${orderId}/payments`);
  revalidatePath("/admin/orders");
  return { success: "Payment recorded — the customer has been sent a receipt." };
}

/** Staff: a payment link the customer can pay without signing in. The link is shown once. */
export async function createPaymentLink(_prev: FormState, form: FormData): Promise<FormState> {
  const orderId = text(form, "orderId");
  const amount = text(form, "amount");
  const result = await api<{ url: string; emailedTo: string | null }>(`/payments/orders/${encodeURIComponent(orderId)}/links`, {
    method: "POST",
    token: sessionToken(),
    body: {
      kind: text(form, "kind") || "BALANCE",
      ...(amount ? { amount: Number(amount) } : {}),
      note: text(form, "note") || undefined,
      validDays: Number(text(form, "validDays") || 7),
      send: form.get("send") === "on",
    },
  });
  if (!result.ok) return { error: denied(result.status) ?? result.message };
  revalidatePath(`/admin/orders/${orderId}/payments`);
  return { success: `Link created${result.data.emailedTo ? ` and emailed to ${result.data.emailedTo}` : ""}. Copy it now — it isn't shown again: ${result.data.url}` };
}

export async function revokePaymentLink(form: FormData) {
  await api(`/payments/links/${encodeURIComponent(text(form, "linkId"))}`, { method: "DELETE", token: sessionToken() });
  revalidatePath(`/admin/orders/${text(form, "orderId")}/payments`);
}

/** Staff: the order for a priced quote, at the prices agreed (they must add up to the quoted total). */
export async function orderFromQuote(_prev: FormState, form: FormData): Promise<FormState> {
  const quoteId = text(form, "quoteId");
  const lines = [...form.keys()]
    .filter((k) => k.startsWith("price_"))
    .map((k) => ({ lineItemId: k.slice("price_".length), unitPrice: Number(text(form, k)) }));
  const result = await api<{ id: string; orderNumber: string }>(`/quotes/${encodeURIComponent(quoteId)}/order`, {
    method: "POST",
    token: sessionToken(),
    body: { lines, deliveryFee: Number(text(form, "deliveryFee") || 0) },
  });
  if (!result.ok) return { error: denied(result.status) ?? result.message };
  revalidatePath("/admin/quotes");
  return { success: `Order ${result.data.orderNumber} created. Send the customer a payment link (or a deposit link) from Admin → Orders → Payments.` };
}
