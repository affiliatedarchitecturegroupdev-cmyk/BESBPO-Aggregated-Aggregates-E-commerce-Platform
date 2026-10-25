import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Price list — Supplier portal", robots: { index: false } };
export const dynamic = "force-dynamic";

type Status = "PENDING" | "APPROVED" | "REJECTED" | "UNMATCHED";
type OwnLine = { id: string; rowNumber: number; supplierCode: string | null; description: string; unit: string | null; unitCost: string; status: Status; problem: string | null; productName: string | null };
type OwnListDetail = { id: string; fileName: string | null; validUntil: string | null; notes: string | null; createdAt: string; lines: OwnLine[] };

const STATUS: Record<Status, { label: string; tone: string }> = {
  PENDING: { label: "With our team", tone: "text-slate" },
  APPROVED: { label: "Accepted", tone: "text-emerald-700" },
  REJECTED: { label: "Not used", tone: "text-slate" },
  UNMATCHED: { label: "Couldn't match", tone: "text-red-700" },
};

const money = (v: string) => `R${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** One of the supplier's price lists, line by line: the product we matched it to and where it stands. */
export default async function SupplierPriceListPage({ params }: { params: { id: string } }) {
  const user = await requireSession(`/suppliers/portal/prices/${params.id}`);
  if (user.role !== "SUPPLIER") notFound();
  const result = await api<OwnListDetail>(`/prices/supplier/lists/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="mx-auto max-w-5xl px-4 py-10 font-body text-sm text-slate">{result.message}</p>;
  }
  const list = result.data;
  const unmatched = list.lines.filter((l) => l.status === "UNMATCHED").length;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/suppliers/portal/prices" className="font-body text-sm text-seam-blue hover:underline">
        ← Your price lists
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-basalt">{list.fileName ?? "Price list"}</h1>
      <p className="mt-1 font-body text-sm text-slate">
        Sent {formatDate(list.createdAt)} · prices hold until {list.validUntil ? formatDate(list.validUntil) : "—"}
      </p>
      {list.notes && <p className="mt-1 font-body text-sm text-basalt">{list.notes}</p>}
      {unmatched > 0 && (
        <p className="mt-4 rounded-sm border border-ochre-gold/40 bg-white p-3 font-body text-sm text-basalt">
          We couldn&apos;t match {unmatched} line{unmatched === 1 ? "" : "s"} to our products. Our team will match what we stock; to help, include your item code and the unit (each, per m², 50 kg
          bag…) on every line next time.
        </p>
      )}
      <div className="mt-6 overflow-x-auto rounded-sm border border-basalt/10 bg-white">
        <table className="w-full min-w-[640px] font-body text-sm">
          <thead className="bg-limestone/60 text-left font-mono text-[10px] uppercase text-slate">
            <tr>
              <th className="px-3 py-2">Your line</th>
              <th className="px-3 py-2">Our product</th>
              <th className="px-3 py-2 text-right">Your price</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-basalt/5">
            {list.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-3 py-2">
                  {l.description}
                  <span className="block font-mono text-[10px] text-slate">
                    {l.supplierCode ? `${l.supplierCode} · ` : ""}row {l.rowNumber}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {l.productName ?? "—"}
                  {l.unit && <span className="block text-xs text-slate">{l.unit}</span>}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{Number(l.unitCost) > 0 ? money(l.unitCost) : "—"}</td>
                <td className={`px-3 py-2 ${STATUS[l.status].tone}`}>
                  {STATUS[l.status].label}
                  {l.status === "UNMATCHED" && l.problem && <span className="block text-xs text-slate">{l.problem}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
