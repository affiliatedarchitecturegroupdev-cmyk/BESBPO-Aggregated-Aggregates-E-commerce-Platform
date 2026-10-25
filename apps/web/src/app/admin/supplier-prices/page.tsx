import Link from "next/link";
import { PriceListUpload } from "@/components/admin/PriceListUpload";
import { api } from "@/lib/api";
import { getLivePrices } from "@/lib/cms";
import { liveProductIndex, PRODUCT_INDEX } from "@/lib/product-index";
import { sessionToken } from "@/lib/session";
import type { Supplier } from "@/lib/suppliers";
import { money, saDate, type LiveSupplierPrice, type PriceCoverage, type PriceListSummary } from "@/lib/supplier-prices";
import { withdrawPrice } from "./actions";

export const metadata = { title: "Supplier prices" };

/**
 * Admin → Supplier prices (ROADMAP Phase 1, docs/supplier-prices.md): upload a supplier's price list, approve the
 * suggested sell prices (cost + the product's standard markup), and see what's live and when it expires.
 */
export default async function SupplierPricesPage() {
  const token = sessionToken();
  const [lists, live, coverage, suppliers, publicLive] = await Promise.all([
    api<PriceListSummary[]>("/prices/staff/lists", { token }),
    api<LiveSupplierPrice[]>("/prices/staff/live", { token }),
    api<PriceCoverage>("/prices/staff/coverage", { token }),
    api<Supplier[]>("/suppliers", { token }),
    getLivePrices(),
  ]);
  const total = PRODUCT_INDEX.length;
  const buyable = liveProductIndex(publicLive).filter((p) => p.fromPrice !== null).length;
  const c = coverage.ok ? coverage.data : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">Supplier prices</h2>
        <p className="mt-1 max-w-3xl font-body text-xs text-slate">
          Upload a supplier&apos;s price list and each row is matched to a product. The suggested sell price is the supplier&apos;s cost plus the product&apos;s standard markup — the same rule as
          sales quotations — and never below cost plus 3%. Nothing changes on the store until you approve it. An approved price replaces the catalogue price on product pages, listings, the cart
          and checkout, with the usual trade discounts, until the list&apos;s valid-until date. Costs and suppliers are never shown to customers.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-sm border border-basalt/10 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate">Priced online</p>
          <p className="mt-1 font-display text-2xl font-bold text-basalt">
            {buyable.toLocaleString("en-US")} <span className="text-base font-normal text-slate">of {total.toLocaleString("en-US")}</span>
          </p>
          <p className="font-body text-xs text-slate">{Math.round((buyable / total) * 1000) / 10}% of the catalogue can be bought online</p>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate">From supplier prices</p>
          <p className="mt-1 font-display text-2xl font-bold text-basalt">{c ? c.liveSkus.toLocaleString("en-US") : "—"}</p>
          <p className="font-body text-xs text-slate">{c ? `${c.livePrices} live prices` : ""}</p>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate">Waiting for you</p>
          <p className="mt-1 font-display text-2xl font-bold text-basalt">{c ? c.pending.toLocaleString("en-US") : "—"}</p>
          <p className="font-body text-xs text-slate">{c ? `${c.unmatched} rows need a product` : ""}</p>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-slate">Expiring in 7 days</p>
          <p className={`mt-1 font-display text-2xl font-bold ${c && c.expiringIn7Days > 0 ? "text-red-700" : "text-basalt"}`}>{c ? c.expiringIn7Days : "—"}</p>
          <p className="font-body text-xs text-slate">Ask the supplier for their next list</p>
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-bold text-basalt">Upload a price list</h3>
        <div className="mt-2">
          <PriceListUpload suppliers={suppliers.ok ? suppliers.data.map((s) => ({ id: s.id, name: s.name, province: s.province })).sort((a, b) => a.name.localeCompare(b.name)) : []} />
        </div>
      </section>

      <section>
        <h3 className="font-display text-lg font-bold text-basalt">Price lists</h3>
        {!lists.ok ? (
          <p className="mt-2 font-body text-sm text-red-800">{lists.message}</p>
        ) : lists.data.length === 0 ? (
          <p className="mt-2 font-body text-sm text-slate">No price lists yet. Supplier costs typed into sales quotations also appear here, as suggestions.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-sm border border-basalt/10 bg-white">
            <table className="w-full min-w-[640px] font-body text-sm">
              <thead className="bg-limestone/60 text-left font-mono text-[10px] uppercase text-slate">
                <tr>
                  <th className="px-3 py-2">List</th>
                  <th className="px-3 py-2">Uploaded</th>
                  <th className="px-3 py-2">Valid until</th>
                  <th className="px-3 py-2 text-right">Waiting</th>
                  <th className="px-3 py-2 text-right">Needs a product</th>
                  <th className="px-3 py-2 text-right">Live</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-basalt/5">
                {lists.data.map((l) => (
                  <tr key={l.id}>
                    <td className="px-3 py-2">
                      <Link href={`/admin/supplier-prices/${l.id}`} className="font-semibold text-seam-blue hover:underline">
                        {l.supplierName}
                      </Link>
                      <span className="block text-xs text-slate">{l.source === "QUOTATION" ? "From sales quotations" : (l.fileName ?? "")}</span>
                    </td>
                    <td className="px-3 py-2 text-slate">{saDate(l.createdAt)}</td>
                    <td className="px-3 py-2 text-slate">{l.validUntil ? saDate(l.validUntil) : "Until replaced"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.counts.PENDING}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.counts.UNMATCHED}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.counts.APPROVED}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="live">
        <h3 className="font-display text-lg font-bold text-basalt">Live supplier prices</h3>
        <p className="mt-1 font-body text-xs text-slate">Soonest to expire first. Withdraw one and the product goes straight back to its catalogue price (quote-only for most).</p>
        {!live.ok ? (
          <p className="mt-2 font-body text-sm text-red-800">{live.message}</p>
        ) : live.data.length === 0 ? (
          <p className="mt-2 font-body text-sm text-slate">No supplier prices are live yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-sm border border-basalt/10 bg-white">
            <table className="w-full min-w-[720px] font-body text-sm">
              <thead className="bg-limestone/60 text-left font-mono text-[10px] uppercase text-slate">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">Sell</th>
                  <th className="px-3 py-2 text-right">Markup</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Valid until</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-basalt/5">
                {live.data.map((p) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2">
                      {p.product ? (
                        <Link href={`/products/${p.product.slug}`} className="text-seam-blue hover:underline" target="_blank">
                          {p.product.name}
                        </Link>
                      ) : (
                        p.sku
                      )}
                      <span className="block font-mono text-[10px] text-slate">
                        {p.sku} · {p.unit}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(p.unitCost)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">{money(p.listPrice)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{Number(p.markupPercent).toFixed(1)}%</td>
                    <td className="px-3 py-2 text-slate">{p.source === "QUOTATION" ? "Sales quotation" : (p.supplierName ?? "—")}</td>
                    <td className="px-3 py-2 text-slate">{p.validUntil ? saDate(p.validUntil) : "Until replaced"}</td>
                    <td className="px-3 py-2 text-right">
                      <form action={withdrawPrice}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className="font-body text-xs text-red-700 hover:underline">Withdraw</button>
                      </form>
                    </td>
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
