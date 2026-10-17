import { setPayfastVisibility, updatePaymentRouting } from "@/app/account/actions";
import { pauseGateway, resumeGateway, saveDepositPolicy, syncPayments } from "@/app/admin/payments/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import Link from "next/link";
import { formatZAR } from "@/lib/pricing";
import { api } from "@/lib/api";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Payment routing" };

const GATEWAYS = ["PAYFAST", "PEACH", "STITCH_DIRECT", "LAYUP", "OZOW_DIRECT", "LULAPAY_DIRECT", "MANUAL_EFT"];
const GATEWAY_LABEL: Record<string, string> = {
  PAYFAST: "PayFast",
  PEACH: "Peach Payments",
  OZOW_DIRECT: "Ozow (direct)",
  STITCH_DIRECT: "Stitch (pay by bank)",
  LULAPAY_DIRECT: "Lulapay (direct)",
  MANUAL_EFT: "Manual EFT / PO",
  LAYUP: "LayUp (lay-by)",
};

type DepositStep = { fromTotal: number; percent: number };
type DepositPolicy = { minOrderTotal: number; retail: DepositStep[]; trade: DepositStep[]; madeToOrderPercent: number; floorPercent: number; ceilingPercent: number };
type Outstanding = { id: string; orderNumber: string; status: string; total: number; amountPaid: number; balance: number; paymentPlan: string; depositPercent: number | null; user: { name: string | null; email: string } | null; company: { name: string } | null }[];
type Incident = { id: string; gateway: string; reason: string; automatic: boolean; startedAt: string; endedAt: string | null };

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
  gateways: { gateway: string; live: boolean; configured: boolean; missingEnvVars: string[]; mode?: "live" | "sandbox"; down: boolean; incident: Incident | null; recentErrors: number }[];
  incidents: Incident[];
  trip: { errors: number; windowMs: number; coolOffMs: number };
  payfastPublic: boolean;
};

type PaymentNotification = {
  id: string;
  gateway: string;
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
  const [user, result, notifications, policy, outstanding] = await Promise.all([
    getSession(),
    api<Routing>("/payment-methods/routing", { token: sessionToken() }),
    api<PaymentNotification[]>("/payment-methods/notifications?limit=20", { token: sessionToken() }),
    api<DepositPolicy>("/payment-methods/deposit-policy"),
    api<Outstanding>("/payments/outstanding", { token: sessionToken() }),
  ]);
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const canEdit = user?.role === "ADMIN";
  const { configs, gateways, payfastPublic, incidents, trip } = result.data;
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
                The credentials are read from the API&apos;s environment and never shown here. A payment shows below as &ldquo;Paid&rdquo; once PayFast
                confirms it. &ldquo;Back to staff only&rdquo; takes PayFast away from customers at once, for example if PayFast pauses the account.
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
                    <th className="py-1.5 pr-3 font-normal">Gateway · ref</th>
                    <th className="py-1.5 pr-3 font-normal">Amount</th>
                    <th className="py-1.5 pr-3 font-normal">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-basalt/5">
                  {notifications.data.map((n) => (
                    <tr key={n.id} className="align-top">
                      <td className="py-1.5 pr-3 font-mono">{new Date(n.createdAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}</td>
                      <td className="py-1.5 pr-3">{n.order ? <a href={`/orders/${n.orderId}/confirmation`} className="text-seam-blue hover:underline">{n.order.orderNumber}</a> : "—"}</td>
                      <td className="py-1.5 pr-3 font-mono">{GATEWAY_LABEL[n.gateway] ?? n.gateway} · {n.providerReference ?? "—"}</td>
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
            <p className="mt-2 font-body text-xs text-slate">None yet — they appear here as PayFast, Peach and Stitch send them.</p>
          )}
        </section>
      )}
      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-body text-sm font-semibold text-basalt">Gateways and failover</h2>
            <p className="max-w-3xl font-body text-xs text-slate">
              A gateway goes live once its credentials are set on the API. If one fails {trip.errors} times in {trip.windowMs / 60_000} minutes, its methods go to
              their fallback for {trip.coolOffMs / 60_000} minutes and staff are emailed; admins can also pause one by hand (e.g. during a provider&apos;s
              announced outage). Payments are only ever marked paid on the gateway&apos;s own word.
            </p>
          </div>
          <ActionForm action={syncPayments} className="flex items-center gap-2">
            <SubmitButton variant="subtle">Check payments with gateways now</SubmitButton>
          </ActionForm>
        </div>
        <ul className="mt-3 grid gap-2 font-body text-sm sm:grid-cols-2 lg:grid-cols-3">
          {gateways.map((g) => (
            <li key={g.gateway} className={`rounded-sm border p-3 ${g.down ? "border-red-300 bg-red-50" : "border-basalt/10"}`}>
              <p className="font-semibold text-basalt">{GATEWAY_LABEL[g.gateway] ?? g.gateway}</p>
              <p className={`font-mono text-[11px] ${g.down ? "text-red-700" : g.live ? "text-seam-blue" : "text-ochre-gold"}`}>
                {g.down
                  ? `${g.incident?.automatic ? "Tripped" : "Paused"} — using fallbacks`
                  : g.live
                    ? `Live${g.mode ? ` · ${g.mode === "live" ? "LIVE — real payments" : "sandbox"}` : ""}`
                    : g.configured
                      ? "Credentials set — integration not switched on"
                      : "Not configured"}
              </p>
              {g.incident && <p className="mt-1 font-body text-[11px] text-slate">{g.incident.reason}</p>}
              {g.recentErrors > 0 && !g.down && <p className="mt-1 font-mono text-[10px] text-ochre-gold">{g.recentErrors} recent error{g.recentErrors === 1 ? "" : "s"}</p>}
              {g.missingEnvVars.length > 0 && <p className="mt-1 font-mono text-[10px] text-slate">Needs: {g.missingEnvVars.join(", ")}</p>}
              {canEdit && g.gateway !== "MANUAL_EFT" && (
                <ActionForm action={g.down ? resumeGateway : pauseGateway} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="gateway" value={g.gateway} />
                  {!g.down && <input name="reason" placeholder="Reason (optional)" className={`${inputClass} !mt-0 max-w-[12rem] !py-1 text-xs`} />}
                  <SubmitButton variant="subtle">{g.down ? "Resume" : "Pause"}</SubmitButton>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
        {incidents.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-seam-blue">Incident history</summary>
            <ul className="mt-2 space-y-1 font-body text-xs text-slate">
              {incidents.map((i) => (
                <li key={i.id}>
                  {new Date(i.startedAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} · {GATEWAY_LABEL[i.gateway] ?? i.gateway} ·{" "}
                  {i.automatic ? "tripped" : "paused"} · {i.reason}
                  {i.endedAt ? ` · ended ${new Date(i.endedAt).toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}` : " · ongoing"}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Balances outstanding</h2>
        <p className="font-body text-xs text-slate">Orders on a deposit or lay-by with money still to come. A confirmed order can&apos;t be dispatched until it&apos;s paid in full.</p>
        {outstanding.ok && outstanding.data.length > 0 ? (
          <ul className="mt-2 divide-y divide-basalt/5 font-body text-xs">
            {outstanding.data.map((o) => (
              <li key={o.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span>
                  <Link href={`/admin/orders/${o.id}/payments`} className="font-mono text-seam-blue hover:underline">{o.orderNumber}</Link> {o.company?.name ?? o.user?.name ?? o.user?.email} ·{" "}
                  {o.paymentPlan === "LAYBY" ? "lay-by" : o.paymentPlan === "DEPOSIT" ? `deposit${o.depositPercent ? ` ${o.depositPercent}%` : ""}` : "part paid"} · {o.status.toLowerCase()}
                </span>
                <span>
                  {formatZAR(o.amountPaid)} of {formatZAR(o.total)} · <strong className="text-ochre-gold">{formatZAR(o.balance)} due</strong>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 font-body text-xs text-slate">Nothing outstanding.</p>
        )}
      </section>

      {policy.ok && (
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Deposit policy</h2>
          <p className="max-w-3xl font-body text-xs text-slate">
            Customers can secure an order of {formatZAR(policy.data.minOrderTotal)} or more with a deposit and pay the balance before delivery. The percentage
            depends on the order total (the highest step it reaches) and the customer&apos;s tier; any cut-to-length line asks for at least the made-to-order
            percentage. Every percentage stays between {policy.data.floorPercent}% and {policy.data.ceilingPercent}%. Not offered for AA 60/120 or lay-by.
          </p>
          <ActionForm action={saveDepositPolicy} className="mt-3 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Minimum order (R)</span>
                <input name="minOrderTotal" type="number" min={0} step="1" defaultValue={policy.data.minOrderTotal} disabled={!canEdit} className={inputClass} />
              </label>
              <label className="block">
                <span className="font-mono text-[10px] uppercase text-slate">Made to order (%)</span>
                <input name="madeToOrderPercent" type="number" min={15} max={50} defaultValue={policy.data.madeToOrderPercent} disabled={!canEdit} className={inputClass} />
              </label>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {(["retail", "trade"] as const).map((tier) => (
                <fieldset key={tier}>
                  <legend className="font-mono text-[10px] uppercase text-slate">{tier === "retail" ? "Retail customers" : "Trade & volume accounts"}: from order total (R) → deposit %</legend>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="mt-2 grid grid-cols-2 gap-2">
                      <input name={`${tier}From${i}`} type="number" min={0} step="1" defaultValue={policy.data[tier][i]?.fromTotal ?? ""} disabled={!canEdit} className={`${inputClass} !mt-0`} aria-label={`${tier} step ${i + 1} from total`} />
                      <input name={`${tier}Pct${i}`} type="number" min={15} max={50} defaultValue={policy.data[tier][i]?.percent ?? ""} disabled={!canEdit} className={`${inputClass} !mt-0`} aria-label={`${tier} step ${i + 1} percent`} />
                    </div>
                  ))}
                </fieldset>
              ))}
            </div>
            {canEdit ? <SubmitButton>Save deposit policy</SubmitButton> : <p className="font-body text-xs text-slate">Only admins can change the deposit policy.</p>}
          </ActionForm>
        </section>
      )}

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
