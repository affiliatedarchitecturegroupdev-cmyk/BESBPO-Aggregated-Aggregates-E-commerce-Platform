import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { sessionToken } from "@/lib/session";
import { LINE_STATUS_LABEL, money, saDate, type PriceLine, type PriceLineStatus, type PriceListDetail } from "@/lib/supplier-prices";
import { approveAll, approveLine, mapLine, rejectLine } from "../actions";

export const metadata = { title: "Price list" };

const FILTERS: { key: PriceLineStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Waiting" },
  { key: "UNMATCHED", label: "Needs a product" },
  { key: "APPROVED", label: "Live" },
  { key: "REJECTED", label: "Rejected" },
];

const small = "rounded-sm border border-basalt/20 px-2 py-1 font-body text-xs";

/** One price list: each row's match, cost, suggested sell price and what customers pay today — approve, fix or reject. */
export default async function PriceListPage({ params, searchParams }: { params: { id: string }; searchParams: { status?: string; error?: string; done?: string } }) {
  const result = await api<PriceListDetail>(`/prices/staff/lists/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="font-body text-sm text-slate">{result.message}</p>;
  }
  const list = result.data;
  const status = (FILTERS.find((f) => f.key === searchParams.status)?.key ?? "ALL") as PriceLineStatus | "ALL";
  const lines = status === "ALL" ? list.lines : list.lines.filter((l) => l.status === status);
  const count = (s: PriceLineStatus) => list.lines.filter((l) => l.status === s).length;
  const expired = list.validUntil !== null && new Date(list.validUntil) <= new Date();

  return (
    <div className="space-y-4">
      <Link href="/admin/supplier-prices" className="font-body text-sm text-seam-blue hover:underline">
        ← Supplier prices
      </Link>
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">{list.supplierName}</h2>
        <p className="mt-1 font-body text-xs text-slate">
          {list.source === "QUOTATION" ? "Supplier costs typed into sales quotations" : `${list.fileName ?? "Price list"}${list.supplierLocation ? ` · ${list.supplierLocation.province}` : ""}`} · uploaded{" "}
          {saDate(list.createdAt)} · {list.validUntil ? `prices valid until ${saDate(list.validUntil)}` : "prices hold until replaced"}
          {expired && <strong className="text-red-700"> · expired — upload the supplier&apos;s current list</strong>}
        </p>
        {list.notes && <p className="mt-1 font-body text-xs text-basalt">{list.notes}</p>}
      </div>
      {searchParams.error && (
        <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
          {searchParams.error}
        </p>
      )}
      {searchParams.done && <p className="rounded-sm border border-seam-blue/30 bg-white p-3 font-body text-sm text-basalt">{searchParams.done}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Filter rows" className="flex flex-wrap gap-2 font-body text-xs">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "ALL" ? `/admin/supplier-prices/${list.id}` : `/admin/supplier-prices/${list.id}?status=${f.key}`}
              aria-current={f.key === status ? "true" : undefined}
              className={`rounded-full border px-3 py-1 ${f.key === status ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt hover:border-seam-blue"}`}
            >
              {f.label} ({f.key === "ALL" ? list.lines.length : count(f.key)})
            </Link>
          ))}
        </nav>
        {count("PENDING") > 0 && !expired && (
          <form action={approveAll}>
            <input type="hidden" name="listId" value={list.id} />
            <button className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">Approve all {count("PENDING")} at the suggested price</button>
          </form>
        )}
      </div>

      <ul className="divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
        {lines.length === 0 && <li className="p-4 font-body text-sm text-slate">No rows here.</li>}
        {lines.map((l) => (
          <LineRow key={l.id} line={l} listId={list.id} expired={expired} />
        ))}
      </ul>
    </div>
  );
}

function LineRow({ line: l, listId, expired }: { line: PriceLine; listId: string; expired: boolean }) {
  const tone = l.status === "APPROVED" ? "text-seam-blue" : l.status === "UNMATCHED" ? "text-red-700" : l.status === "REJECTED" ? "text-slate" : "text-basalt";
  return (
    <li id={`line-${l.id}`} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <p className="font-body text-sm text-basalt">
          {l.product ? (
            <Link href={`/products/${l.product.slug}`} target="_blank" className="font-semibold text-seam-blue hover:underline">
              {l.product.name}
            </Link>
          ) : (
            <span className="font-semibold">{l.description}</span>
          )}
          {l.unit && <span className="text-slate"> · {l.unit}</span>}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase text-slate">
          Row {l.rowNumber}
          {l.supplierCode ? ` · supplier code ${l.supplierCode}` : ""}
          {l.product && l.description !== l.product.name ? ` · listed as “${l.description}”` : ""} · <span className={tone}>{LINE_STATUS_LABEL[l.status]}</span>
        </p>
        <p className="mt-1 font-body text-xs text-slate">
          Cost <strong className="text-basalt">{money(l.unitCost)}</strong>
          {l.markupPercent !== null && ` · standard markup ${Number(l.markupPercent).toFixed(0)}%`}
          {l.suggestedPrice !== null && (
            <>
              {" "}
              · suggested <strong className="text-basalt">{money(l.suggestedPrice)}</strong>
            </>
          )}{" "}
          · customers pay today {l.currentPrice !== null ? money(l.currentPrice) : "— (quote only)"}
          {l.approvedPrice !== null && ` · approved at ${money(l.approvedPrice)}`}
        </p>
        {l.problem && <p className="mt-1 font-body text-xs text-red-800">{l.problem}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {l.status === "PENDING" && !expired && (
          <form action={approveLine} className="flex items-center gap-2">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="listId" value={listId} />
            <label className="sr-only" htmlFor={`price-${l.id}`}>
              Sell price
            </label>
            <input id={`price-${l.id}`} name="price" type="number" step="0.01" min="0.01" defaultValue={l.suggestedPrice ?? ""} className={`${small} w-28`} />
            <button className="rounded-sm bg-seam-blue px-3 py-1 font-body text-xs font-semibold text-limestone hover:bg-basalt">Approve</button>
          </form>
        )}
        {l.status === "UNMATCHED" && Number(l.unitCost) > 0 && (
          <form action={mapLine} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="listId" value={listId} />
            <input name="sku" required defaultValue={l.sku ?? ""} placeholder="Our SKU" aria-label="Our SKU" className={`${small} w-48`} />
            <input name="unit" defaultValue={l.unit ?? ""} placeholder="Unit (EACH…)" aria-label="Unit" className={`${small} w-28`} />
            <button className="rounded-sm border border-seam-blue px-3 py-1 font-body text-xs font-semibold text-seam-blue hover:bg-limestone">Match</button>
          </form>
        )}
        {(l.status === "PENDING" || l.status === "UNMATCHED") && (
          <form action={rejectLine}>
            <input type="hidden" name="id" value={l.id} />
            <input type="hidden" name="listId" value={listId} />
            <button className="rounded-sm border border-basalt/20 px-3 py-1 font-body text-xs text-basalt hover:bg-limestone">Reject</button>
          </form>
        )}
      </div>
    </li>
  );
}
