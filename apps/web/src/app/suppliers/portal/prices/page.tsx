import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OwnPriceListForm } from "@/components/suppliers/OwnPriceListForm";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Your price list — Supplier portal", robots: { index: false } };
export const dynamic = "force-dynamic";

type OwnList = { id: string; fileName: string | null; validUntil: string | null; createdAt: string; counts: Record<"PENDING" | "APPROVED" | "REJECTED" | "UNMATCHED", number> };

/**
 * The supplier's own price lists (ROADMAP 1.5, docs/supplier-prices.md): upload the current list, see which rows
 * we matched to our products and where our team has got with them. Our sell prices are never shown here.
 */
export default async function SupplierPricesPage() {
  const user = await requireSession("/suppliers/portal/prices");
  if (user.role !== "SUPPLIER") notFound();
  const lists = await api<OwnList[]>("/prices/supplier/lists", { token: sessionToken() });
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/suppliers/portal" className="font-body text-sm text-seam-blue hover:underline">
        ← Orders
      </Link>
      <h1 className="mt-3 font-display text-2xl font-bold text-basalt">Your price list</h1>
      <p className="mt-1 max-w-3xl font-body text-sm text-slate">
        Send us your current prices whenever they change — the file you already use is fine, with your code or description, the unit and your price per unit to us. We match each line to
        our products, and our team checks it before anything changes. Your prices stop applying after the date you give, so send a new list before then.
      </p>
      <div className="mt-6">
        <OwnPriceListForm />
      </div>
      <h2 className="mt-10 font-display text-lg font-bold text-basalt">Lists you&apos;ve sent</h2>
      {!lists.ok ? (
        <p className="mt-2 font-body text-sm text-red-800">{lists.message}</p>
      ) : lists.data.length === 0 ? (
        <p className="mt-2 font-body text-sm text-slate">None yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {lists.data.map((l) => (
            <li key={l.id} className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link href={`/suppliers/portal/prices/${l.id}`} className="font-semibold text-seam-blue hover:underline">
                  {l.fileName ?? "Price list"}
                </Link>
                <span className="text-xs text-slate">
                  sent {formatDate(l.createdAt)} · holds until {l.validUntil ? formatDate(l.validUntil) : "—"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate">
                {l.counts.APPROVED} accepted · {l.counts.PENDING} with our team · {l.counts.UNMATCHED} we couldn&apos;t match · {l.counts.REJECTED} not used
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
