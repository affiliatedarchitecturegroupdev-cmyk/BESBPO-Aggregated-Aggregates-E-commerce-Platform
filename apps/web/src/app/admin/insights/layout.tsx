import { Suspense } from "react";
import { InsightsNav } from "@/components/insights/InsightsNav";
import { getSession } from "@/lib/session";

export const metadata = { title: { default: "Insights", template: "%s — Insights — Admin" } };

/**
 * Admin → Insights (ANALYTICS.md, Phase 3): sales, products, customers, hire,
 * pipeline, geography, marketing and — for admins — profit & loss. Staff see
 * sales and revenue; the API removes cost and profit for anyone but admins.
 */
export default async function InsightsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">Insights</h2>
        <p className="mt-1 max-w-3xl font-body text-xs text-slate">
          Sales count from the day payment was confirmed. Test orders and bookings are left out. Days are South African days.
          {user?.role === "ADMIN" ? " Cost, profit and P&L figures are visible to admins only." : " Cost and profit figures are visible to admins only."}
        </p>
      </div>
      <Suspense>
        <InsightsNav isAdmin={user?.role === "ADMIN"} />
      </Suspense>
      {children}
    </div>
  );
}
