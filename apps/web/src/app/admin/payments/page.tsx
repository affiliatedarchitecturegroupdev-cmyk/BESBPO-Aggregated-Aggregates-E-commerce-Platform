import { setPayfastVisibility, updatePaymentRouting } from "@/app/account/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Payment routing" };

const GATEWAYS = ["PAYFAST", "PEACH", "OZOW_DIRECT", "STITCH_DIRECT", "LULAPAY_DIRECT", "MANUAL_EFT"];
const GATEWAY_LABEL: Record<string, string> = {
  PAYFAST: "PayFast",
  PEACH: "Peach Payments",
  OZOW_DIRECT: "Ozow (direct)",
  STITCH_DIRECT: "Stitch (direct)",
  LULAPAY_DIRECT: "Lulapay (direct)",
  MANUAL_EFT: "Manual EFT / PO",
};

type Routing = {
  configs: {
    methodKey: string;
    displayName: string;
    activeGateway: string;
    fallbackGateway: string | null;
    minOrderValue: string | null;
    maxOrderValue: string | null;
    tradeOnly: boolean;
    isEnabled: boolean;
  }[];
  gateways: { gateway: string; live: boolean; configured: boolean; missingEnvVars: string[]; mode?: "live" | "sandbox" }[];
  payfastPublic: boolean;
};

type PaymentNotification = {
  id: string;
  orderId: string | null;
  order: { orderNumber: string } | null;
  providerReference: string | null;
  paymentStatus: string | null;
  amount: string | null;
  outcome: "PAID" | "ALREADY_PAID" | "NOT_PAID" | "REJECTED";
  reason: string | null;
  createdAt: string;
};

const OUTCOME: Record<PaymentNotification["outcome"], { label: string; tone: string }> = {
  PAID: { label: "Paid — order confirmed", tone: "text-emerald-700" },
  ALREADY_PAID: { label: "Already handled", tone: "text-slate" },
  NOT_PAID: { label: "Not paid", tone: "text-ochre-gold" },
  REJECTED: { label: "Rejected", tone: "text-red-700" },
};

/**
 * Payment routing (AGENTIC_RULES.md rule 8): which gateway processes each
 * payment tile, its failover, and its order-value limits. Shoppers only ever
 * see the tiles. Staff can view; admins can change it.
 */
export default async function PaymentsPage() {
  const [user, result, notifications] = await Promise.all([
    getSession(),
    api<Routing>("/payment-methods/routing", { token: sessionToken() }),
    api<PaymentNotification[]>("/payment-methods/notifications?limit=20", { token: sessionToken() }),
  ]);
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const canEdit = user?.role === "ADMIN";
  const { configs, gateways, payfastPublic } = result.data;
  const payfast = gateways.find((g) => g.gateway === "PAYFAST");
  return (
    <div className="space-y-6">
      {payfast && (
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-body text-sm font-semibold text-basalt">PayFast</h2>
              <p className="mt-1 font-mono text-[11px]">
                {payfast.configured ? (
                  <span className="text-seam-blue">Configured · {payfast.mode === "live" ? "LIVE — real payments" : "sandbox (test payments)"}</span>
                ) : (
                  <span className="text-ochre-gold">Not configured — needs {payfast.missingEnvVars.join(", ")} on the API</span>
                )}
              </p>
              <p className="mt-1 font-mono text-[11px] text-basalt">
                Checkout: {payfastPublic ? "open to customers" : "staff only — customers are asked to choose another method"}
              </p>
              <p className="mt-2 max-w-2xl font-body text-xs text-slate">
                The credentials are read from the API&apos;s environment and never shown here. Test with a small real order while it&apos;s staff only:
                pay it through PayFast, check it shows below as &ldquo;Paid&rdquo; and the order is confirmed, refund it from the PayFast dashboard, then
                open checkout to customers.
              </p>
            </div>
            {canEdit && payfast.configured && (
              <ActionForm action={setPayfastVisibility} className="flex items-center gap-2">
                <input type="hidden" name="public" value={payfastPublic ? "false" : "true"} />
                <SubmitButton variant={payfastPublic ? "subtle" : "primary"}>{payfastPublic ? "Back to staff only" : "Open to customers"}</SubmitButton>
              </ActionForm>
            )}
          </div>
          <h3 className="mt-5 font-mono text-[10px] uppercase tracking-widest text-seam-blue">Latest payment notifications</h3>
          {notifications.ok && notifications.data.length > 0 ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left font-body text-xs">
                <thead className="text-slate">
                  <tr>
                    <th className="py-1.5 pr-3 font-normal">Received</th>
                    <th className="py-1.5 pr-3 font-normal">Order</th>
                    <th className="py-1.5 pr-3 font-normal">PayFast ref</th>
                    <th className="py-1.5 pr-3 font-normal">Amount</th>
                    <th className="py-1.5 pr-3 font-normal">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-basalt/5">
                  {notifications.data.map((n) => (
                    <tr key={n.id} className="align-top">
                      <td className="py-1.5 pr-3 font-mono">{new Date(n.createdAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td>
                      <td className="py-1.5 pr-3">{n.order ? <a href={`/orders/${n.orderId}/confirmation`} className="text-seam-blue hover:underline">{n.order.orderNumber}</a> : "—"}</td>
                      <td className="py-1.5 pr-3 font-mono">{n.providerReference ?? "—"}</td>
                      <td className="py-1.5 pr-3">{n.amount ? `R${Number(n.amount).toFixed(2)}` : "—"}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`font-semibold ${OUTCOME[n.outcome].tone}`}>{OUTCOME[n.outcome].label}</span>
                        {n.paymentStatus && <span className="text-slate"> · {n.paymentStatus}</span>}
                        {n.reason && <span className="block text-slate">{n.reason}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 font-body text-xs text-slate">None yet — they appear here as PayFast sends them.</p>
          )}
        </section>
      )}
      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Gateways</h2>
        <p className="font-body text-xs text-slate">
          A gateway goes live once its merchant credentials are set on the API and its integration is switched on. Until
          then, payments routed to it fall over to the method&apos;s fallback, or tell the buyer to choose another method.
        </p>
        <ul className="mt-3 grid gap-2 font-body text-sm sm:grid-cols-2 lg:grid-cols-3">
          {gateways.map((g) => (
            <li key={g.gateway} className="rounded-sm border border-basalt/10 p-3">
              <p className="font-semibold text-basalt">{GATEWAY_LABEL[g.gateway] ?? g.gateway}</p>
              <p className={`font-mono text-[11px] ${g.live ? "text-seam-blue" : "text-ochre-gold"}`}>
                {g.live ? "Live" : g.configured ? "Credentials set — integration not switched on" : "Not configured"}
              </p>
              {g.missingEnvVars.length > 0 && <p className="mt-1 font-mono text-[10px] text-slate">Needs: {g.missingEnvVars.join(", ")}</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Payment methods</h2>
        {!canEdit && <p className="font-body text-xs text-slate">Only admins can change routing.</p>}
        <div className="mt-3 divide-y divide-basalt/5">
          {configs.map((c) => (
            <ActionForm key={c.methodKey} action={updatePaymentRouting} className="grid items-end gap-3 py-3 lg:grid-cols-[1.4fr_1fr_1fr_0.7fr_0.7fr_auto_auto]">
              <input type="hidden" name="methodKey" value={c.methodKey} />
              <div>
                <p className="font-body text-sm font-semibold text-basalt">{c.displayName}</p>
                {c.tradeOnly && <p className="font-mono text-[10px] text-slate">Trade accounts only</p>}
              </div>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Gateway</span>
                <select name="activeGateway" defaultValue={c.activeGateway} disabled={!canEdit} className={inputClass}>
                  {GATEWAYS.map((g) => (
                    <option key={g} value={g}>{GATEWAY_LABEL[g]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Fallback</span>
                <select name="fallbackGateway" defaultValue={c.fallbackGateway ?? ""} disabled={!canEdit} className={inputClass}>
                  <option value="">None</option>
                  {GATEWAYS.map((g) => (
                    <option key={g} value={g}>{GATEWAY_LABEL[g]}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Min (R)</span>
                <input name="minOrderValue" type="number" min={0} step="0.01" defaultValue={c.minOrderValue ?? ""} disabled={!canEdit} className={inputClass} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Max (R)</span>
                <input name="maxOrderValue" type="number" min={0} step="0.01" defaultValue={c.maxOrderValue ?? ""} disabled={!canEdit} className={inputClass} />
              </label>
              <label className="flex items-center gap-2 pb-2 font-body text-xs text-basalt">
                <input type="checkbox" name="isEnabled" defaultChecked={c.isEnabled} disabled={!canEdit} className="h-4 w-4" /> On
              </label>
              {canEdit ? <SubmitButton variant="subtle">Save</SubmitButton> : <span />}
            </ActionForm>
          ))}
        </div>
      </section>
    </div>
  );
}
