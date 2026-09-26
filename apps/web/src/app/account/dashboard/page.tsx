import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trade Account Dashboard", robots: { index: false } };

const SAMPLE_ORDERS = [
  { orderNumber: "AA-10245", date: "18 Sep 2026", products: "G5 Natural Gravel, 19mm Crushed Stone", region: "KwaZulu-Natal", status: "Delivered", total: "R14,200.00" },
  { orderNumber: "AA-10238", date: "11 Sep 2026", products: "River Sand (Washed) ×10m³", region: "KwaZulu-Natal", status: "In Transit", total: "R5,555.20" },
  { orderNumber: "AA-10221", date: "29 Aug 2026", products: "Crusher Run 0–19mm", region: "Gauteng", status: "Delivered", total: "R8,960.00" },
];

/**
 * Module 4: Trade Account & Customer Tier Management dashboard — tier
 * status, recent orders, and standing agreements. Lighter than a full
 * Business Desk suite by design (see feature adoption matrix).
 */
export default function TradeDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="grid gap-8 md:grid-cols-[220px_1fr]">
        <aside className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
          <ul className="space-y-2">
            <li className="rounded-sm bg-seam-blue px-3 py-2 font-semibold text-limestone">Dashboard</li>
            <li className="px-3 py-2 text-basalt">Order History</li>
            <li className="px-3 py-2 text-basalt">Quotes / RFQs</li>
            <li className="px-3 py-2 text-basalt">Standing Agreements</li>
            <li className="px-3 py-2 text-basalt">Delivery Addresses</li>
            <li className="px-3 py-2 text-basalt">Invoices & Statements</li>
            <li className="px-3 py-2 text-basalt">Account Settings</li>
          </ul>
        </aside>

        <div>
          <p className="mb-4 rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-3 font-body text-xs text-basalt">
            <strong>Preview with sample data.</strong> Sign-in and live account data arrive with trade accounts in Phase 3.
          </p>
          <h1 className="font-display text-xl font-bold text-basalt">Welcome back — Company: XYZ Civil Contractors (Pty) Ltd</h1>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Account Tier", value: "Contractor / Trade", detail: "8% off list" },
              { label: "Orders This Month", value: "6 orders" },
              { label: "Outstanding Balance", value: "R48,320.00" },
              { label: "Standing Agreement", value: "KZN Civil — active" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-sm border border-basalt/10 bg-white p-4">
                <p className="font-mono text-[10px] uppercase text-slate">{stat.label}</p>
                <p className="mt-1 font-body text-sm font-semibold text-basalt">{stat.value}</p>
                {stat.detail && <p className="font-body text-xs text-slate">{stat.detail}</p>}
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-sm border border-basalt/10 bg-white">
            <p className="border-b border-basalt/10 px-4 py-3 font-body text-sm font-semibold text-basalt">Recent Orders</p>
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-basalt/10 text-left text-xs text-slate">
                  <th className="px-4 py-2">Order #</th>
                  <th>Date</th>
                  <th>Products</th>
                  <th>Delivered in</th>
                  <th>Status</th>
                  <th className="pr-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ORDERS.map((order) => (
                  <tr key={order.orderNumber} className="border-b border-basalt/5">
                    <td className="px-4 py-3">{order.orderNumber}</td>
                    <td>{order.date}</td>
                    <td>{order.products}</td>
                    <td>{order.region}</td>
                    <td>{order.status}</td>
                    <td className="pr-4 text-right">{order.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
