import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { IMPORT_STATUS_LABEL, ROW_STATUS_LABEL, type CatalogueImport, type ImportRowStatus } from "@/lib/catalogue-import";
import { money, saDate } from "@/lib/supplier-prices";
import { sessionToken } from "@/lib/session";
import { applyImport, discardImport } from "../actions";

export const metadata = { title: "Catalogue import" };

const FILTERS: { key: ImportRowStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "NEW", label: "New" },
  { key: "EXISTS", label: "Already listed" },
  { key: "PROBLEM", label: "Can't add" },
];

const TONE: Record<ImportRowStatus, string> = { NEW: "text-seam-blue", EXISTS: "text-slate", PROBLEM: "text-red-700" };

/** One import: every row as checked — what will be added, what's already a product, and why a row can't be added. */
export default async function CatalogueImportDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { status?: string; error?: string; done?: string } }) {
  const result = await api<CatalogueImport>(`/catalogue-import/staff/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="font-body text-sm text-slate">{result.message}</p>;
  }
  const run = result.data;
  const status = (FILTERS.find((f) => f.key === searchParams.status)?.key ?? "ALL") as ImportRowStatus | "ALL";
  const rows = status === "ALL" ? run.rows : run.rows.filter((r) => r.status === status);
  const preview = run.status === "PREVIEW";
  const learnable = run.supplierLocationId ? run.rows.filter((r) => r.status !== "PROBLEM" && r.supplierCode).length : 0;

  return (
    <div className="space-y-4">
      <Link href="/admin/catalogue-import" className="font-body text-sm text-seam-blue hover:underline">
        ← Catalogue import
      </Link>
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">{run.fileName}</h2>
        <p className="mt-1 font-body text-xs text-slate">
          {run.supplierName ? `${run.supplierName} · ` : "No supplier · "}checked {saDate(run.createdAt)}
          {run.appliedAt ? ` · added ${saDate(run.appliedAt)}` : ""} · <strong className="text-basalt">{IMPORT_STATUS_LABEL[run.status]}</strong>
        </p>
      </div>
      {searchParams.error && (
        <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
          {searchParams.error}
        </p>
      )}
      {searchParams.done && run.status === "APPLIED" && (
        <p className="rounded-sm border border-seam-blue/30 bg-white p-3 font-body text-sm text-basalt">
          {run.counts.NEW} product{run.counts.NEW === 1 ? "" : "s"} added — on the store as quote-only within a minute.
          {run.priceListId && (
            <>
              {" "}
              The {run.counts.withCost} cost{run.counts.withCost === 1 ? "" : "s"} wait for approval in{" "}
              <Link href={`/admin/supplier-prices/${run.priceListId}`} className="font-semibold text-seam-blue hover:underline">
                the supplier&apos;s price list
              </Link>
              .
            </>
          )}
        </p>
      )}

      <div className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-basalt">
        <p>
          <strong>{run.counts.NEW}</strong> new product{run.counts.NEW === 1 ? "" : "s"} · <strong>{run.counts.EXISTS}</strong> already listed · <strong>{run.counts.PROBLEM}</strong> can&apos;t be added
          {run.supplierName && (
            <>
              {" "}
              · {learnable} supplier code{learnable === 1 ? "" : "s"} to learn · {run.counts.withCost} cost{run.counts.withCost === 1 ? "" : "s"} for approval
              {run.validUntil ? `, valid until ${saDate(run.validUntil)}` : ""}
            </>
          )}
        </p>
        {!run.supplierName && run.counts.withCost > 0 && <p className="mt-1 text-xs text-slate">Costs in the file are ignored without a supplier — import again with the supplier chosen to send them for approval.</p>}
        {run.status === "APPLIED" && run.priceListId && (
          <p className="mt-1 text-xs">
            Costs:{" "}
            <Link href={`/admin/supplier-prices/${run.priceListId}`} className="text-seam-blue hover:underline">
              the supplier&apos;s price list
            </Link>
          </p>
        )}
        {preview && (
          <div className="mt-3 flex flex-wrap gap-3">
            {(run.counts.NEW > 0 || learnable > 0) && (
              <form action={applyImport}>
                <input type="hidden" name="id" value={run.id} />
                <button className="rounded-sm bg-seam-blue px-4 py-2 text-sm font-semibold text-limestone hover:bg-basalt">
                  {run.counts.NEW > 0 ? `Add ${run.counts.NEW} new product${run.counts.NEW === 1 ? "" : "s"}` : "Learn the supplier's codes"}
                </button>
              </form>
            )}
            <form action={discardImport}>
              <input type="hidden" name="id" value={run.id} />
              <button className="rounded-sm border border-basalt/20 px-4 py-2 text-sm text-basalt hover:border-red-700 hover:text-red-700">Discard</button>
            </form>
          </div>
        )}
      </div>

      <nav aria-label="Filter rows" className="flex flex-wrap gap-2 font-body text-xs">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "ALL" ? `/admin/catalogue-import/${run.id}` : `/admin/catalogue-import/${run.id}?status=${f.key}`}
            aria-current={f.key === status ? "true" : undefined}
            className={`rounded-full border px-3 py-1 ${f.key === status ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt hover:border-seam-blue"}`}
          >
            {f.label} ({f.key === "ALL" ? run.rows.length : run.counts[f.key]})
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-sm border border-basalt/10 bg-white">
        <table className="w-full min-w-[720px] font-body text-xs">
          <thead>
            <tr className="border-b border-basalt/10 text-left text-slate">
              <th className="p-2">Row</th>
              <th className="p-2">Product</th>
              <th className="p-2">Category</th>
              <th className="p-2">Sold by</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Cost</th>
              <th className="p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-3 text-slate">
                  No rows here.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.rowNumber} className="border-t border-basalt/5 align-top">
                <td className="p-2 font-mono text-slate">{r.rowNumber}</td>
                <td className="p-2 text-basalt">
                  {run.status === "APPLIED" && r.status !== "PROBLEM" && r.slug ? (
                    <Link href={`/products/${r.slug}`} target="_blank" className="font-semibold text-seam-blue hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{r.name || "—"}</span>
                  )}
                  {[r.brand, r.size, r.standard].filter(Boolean).length > 0 && <span className="block text-slate">{[r.brand, r.size, r.standard].filter(Boolean).join(" · ")}</span>}
                  {r.supplierCode && <span className="block font-mono text-[10px] uppercase text-slate">Supplier code {r.supplierCode}</span>}
                </td>
                <td className="p-2 text-basalt">{r.categoryName ?? <span className="text-slate">{r.category || "—"}</span>}</td>
                <td className="p-2 text-basalt">{r.unitLabels.length ? r.unitLabels.join(", ") : "—"}</td>
                <td className="p-2 font-mono text-[11px] text-basalt">{r.sku ?? "—"}</td>
                <td className="p-2 text-basalt">{r.cost !== null ? money(r.cost) : "—"}</td>
                <td className={`p-2 ${TONE[r.status]}`}>
                  {ROW_STATUS_LABEL[r.status]}
                  {r.problem && <span className="block text-red-800">{r.problem}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
