import { updatePaymentRouting } from "@/app/account/actions";
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
  gateways: { gateway: string; live: boolean; configured: boolean; missingEnvVars: string[] }[];
};

/**
 * Payment routing (AGENTIC_RULES.md rule 8): which gateway processes each
 * payment tile, its failover, and its order-value limits. Shoppers only ever
 * see the tiles. Staff can view; admins can change it.
 */
export default async function PaymentsPage() {
  const [user, result] = await Promise.all([getSession(), api<Routing>("/payment-methods/routing", { token: sessionToken() })]);
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const canEdit = user?.role === "ADMIN";
  const { configs, gateways } = result.data;
  return (
    <div className="space-y-6">
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
