import { BestWithRuleForm } from "@/components/admin/BestWithRuleForm";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";
import { recomputeBestWith, removeBestWithRule } from "./actions";

export const metadata = { title: "Best With" };

type Named = { sku: string; name: string };
type Overview = {
  minOrders: number;
  computedAt: string | null;
  pairings: { product: Named; paired: Named; orders: number; confidence: number; lift: number }[];
  rules: { product: Named; paired: Named; action: "PIN" | "HIDE"; note: string | null; createdAt: string }[];
};

const when = (iso: string) => new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });
const percent = (n: number) => `${Math.round(n * 100)}%`;

/**
 * Staff: Best With (docs/best-with.md) — the pairings customers' paid orders
 * show, and the pins and hides that override them. Staff-only numbers:
 * customers only ever see which products go together.
 */
export default async function AdminBestWithPage() {
  const result = await api<Overview>("/merchandising/best-with/overview", { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const { pairings, rules, minOrders, computedAt } = result.data;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h2 className="font-display text-xl font-bold text-basalt">Best With</h2>
          <p className="mt-1 font-body text-sm text-slate">
            On every product page and in the cart, customers see what&apos;s bought with a product: your pins first, then pairings from paid orders (test
            orders never count), then the rest of the job&apos;s checklist. A pairing counts once it&apos;s in {minOrders} different paid orders. Scores
            rebuild daily{computedAt ? ` — last rebuilt ${when(computedAt)}` : ""}.
          </p>
        </div>
        <form action={recomputeBestWith}>
          <button type="submit" className="rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm font-semibold text-basalt hover:border-seam-blue">
            Rebuild now
          </button>
        </form>
      </div>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold text-basalt">Pins and hides</h3>
        <BestWithRuleForm />
        {rules.length === 0 ? (
          <p className="font-body text-sm text-slate">No rules yet — suggestions come from orders and the job checklists.</p>
        ) : (
          <ul className="divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
            {rules.map((r) => (
              <li key={`${r.product.sku}-${r.paired.sku}`} className="flex flex-wrap items-center justify-between gap-3 p-3 font-body text-sm">
                <span>
                  <span className={`mr-2 rounded-sm px-1.5 py-0.5 font-mono text-[10px] ${r.action === "PIN" ? "bg-seam-blue/10 text-seam-blue" : "bg-basalt/10 text-basalt"}`}>{r.action}</span>
                  On <strong>{r.product.name}</strong> <span className="font-mono text-[11px] text-slate">{r.product.sku}</span> → <strong>{r.paired.name}</strong>{" "}
                  <span className="font-mono text-[11px] text-slate">{r.paired.sku}</span>
                  {r.note && <span className="block text-xs text-slate">“{r.note}”</span>}
                </span>
                <form action={removeBestWithRule}>
                  <input type="hidden" name="productSku" value={r.product.sku} />
                  <input type="hidden" name="pairedSku" value={r.paired.sku} />
                  <button type="submit" className="font-body text-xs font-semibold text-seam-blue hover:underline">
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-lg font-bold text-basalt">Bought together (paid orders)</h3>
        {pairings.length === 0 ? (
          <p className="font-body text-sm text-slate">
            No pairing has reached {minOrders} paid orders yet. Until then, product pages show each job&apos;s checklist, plus any pins.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-basalt/10 bg-white">
            <table className="w-full min-w-[640px] font-body text-sm">
              <thead className="bg-limestone text-left text-xs text-slate">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2">Bought with</th>
                  <th className="p-2 text-right">Orders</th>
                  <th className="p-2 text-right" title="Share of the product's orders that included the other">Share</th>
                  <th className="p-2 text-right" title="Above 1 means more often than chance">Lift</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-basalt/5">
                {pairings.map((p) => (
                  <tr key={`${p.product.sku}-${p.paired.sku}`}>
                    <td className="p-2">
                      {p.product.name} <span className="font-mono text-[10px] text-slate">{p.product.sku}</span>
                    </td>
                    <td className="p-2">
                      {p.paired.name} <span className="font-mono text-[10px] text-slate">{p.paired.sku}</span>
                    </td>
                    <td className="p-2 text-right">{p.orders}</td>
                    <td className="p-2 text-right">{percent(p.confidence)}</td>
                    <td className="p-2 text-right">{p.lift.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
