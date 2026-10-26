import { DdpPolicyForm, type DdpPolicy } from "@/components/admin/DdpPolicyForm";
import { api } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";
import { getSession, sessionToken } from "@/lib/session";

export const metadata = { title: "Delivery premium" };

type Stats = { since: string; paidOrders: number; ordersWithPremium: number; premiumCollected: number };

/**
 * Distributed Delivery Premium (docs/delivery-premium.md): the rates, and
 * how it has worked out over the last 90 days — so the rates can be tuned
 * against what extra collections actually cost (Insights → Finance).
 */
export default async function AdminDeliveryPremiumPage() {
  const [user, policy, stats] = await Promise.all([
    getSession(),
    api<DdpPolicy>("/orders/delivery-premium/policy"),
    api<Stats>("/orders/delivery-premium/stats", { token: sessionToken() }),
  ]);
  if (!policy.ok) return <p className="font-body text-sm text-slate">{policy.message}</p>;
  const p = policy.data;
  return (
    <div className="space-y-6">
      <div className="max-w-3xl">
        <h2 className="font-display text-xl font-bold text-basalt">Distributed delivery premium</h2>
        <p className="mt-1 font-body text-sm text-slate">
          An order of {p.minProducts} or more different products that has to be collected from more than one supply point pays for the extra
          collections. The delivery fee covers the main (heaviest) supply point; the premium covers the others:{" "}
          {formatZAR(p.twoOriginFee)} for 2 points, {formatZAR(p.threeOriginFee)} for 3, {formatZAR(p.extraOriginFee)} for each one after that, plus{" "}
          {formatZAR(p.heavyPerTon)} per ton (or part) of heavy goods from the extra points. If one verified partner supplier near the site stocks
          everything, the order counts as one supply point and pays nothing extra. Customers see the amount and the supply points before they pay.
        </p>
      </div>

      {stats.ok && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Paid orders (90 days)", String(stats.data.paidOrders)],
            ["Orders that paid the premium", `${stats.data.ordersWithPremium}${stats.data.paidOrders ? ` (${Math.round((stats.data.ordersWithPremium / stats.data.paidOrders) * 100)}%)` : ""}`],
            ["Premium collected", formatZAR(stats.data.premiumCollected)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-sm border border-basalt/10 bg-white p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-slate">{label}</p>
              <p className="mt-1 font-display text-2xl font-bold text-basalt">{value}</p>
            </div>
          ))}
        </div>
      )}

      <DdpPolicyForm policy={p} canEdit={user?.role === "ADMIN"} />

      <p className="max-w-3xl font-body text-xs text-slate">
        Test orders never count. Compare the premium collected with the delivery costs recorded at dispatch (Insights → Finance) to check the
        rates cover the extra collections. A supplier&apos;s own flatbed or crane-truck charge for steel, bricks, roofing or building supplies is set
        in Delivery rates; until it is, it&apos;s confirmed with the customer before dispatch.
      </p>
    </div>
  );
}
