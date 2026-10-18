import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPodLink, respondToOrder, setDropReady } from "@/app/suppliers/portal/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { formatDate, UNIT_LABEL } from "@/lib/account-types";
import { DROP_STATUS_LABEL, type PortalOrder } from "@/lib/phase4";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Order to load", robots: { index: false } };
export const dynamic = "force-dynamic";

const unit = (u: string | null) => (u ? (UNIT_LABEL[u as keyof typeof UNIT_LABEL] ?? "") : "");
const today = () => new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);

/** One order in the supplier portal: what to load, where it goes, the drops, and the supplier's answer. No prices or customer contact details. */
export default async function SupplierOrderPage({ params }: { params: { id: string } }) {
  const user = await requireSession(`/suppliers/portal/orders/${params.id}`);
  if (user.role !== "SUPPLIER") notFound();
  const result = await api<PortalOrder>(`/supplier-portal/orders/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) notFound();
  const o = result.data;
  const open = o.status === "PENDING" || o.status === "CONFIRMED";
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="font-mono text-xs text-slate"><Link href="/suppliers/portal" className="hover:text-seam-blue">Supplier portal</Link> / {o.orderNumber}</nav>
      <h1 className="mt-3 font-display text-2xl font-bold text-basalt">Order <span className="font-mono">{o.orderNumber}</span></h1>
      <p className="mt-1 font-body text-sm text-slate">
        {o.canLoad ? "Paid (or on account) — ready to load." : o.status === "PENDING" ? "Not paid yet — please don't load until it's confirmed; we'll email you." : ""}
      </p>

      <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
        <h2 className="font-semibold text-basalt">To load</h2>
        <ul className="mt-2 space-y-1">
          {o.lineItems.map((l) => <li key={l.id}>{l.quantity} {unit(l.unitOfSale)} — {l.name} <span className="font-mono text-[11px] text-slate">{l.sku}</span></li>)}
        </ul>
        {o.deliveryAddress && <p className="mt-3 border-t border-basalt/10 pt-3 text-slate">Delivering to {o.deliveryAddress}{o.deliveryProvince ? `, ${o.deliveryProvince}` : ""}</p>}
        {o.notes && <p className="mt-2 text-slate">Customer&apos;s note: {o.notes}</p>}
      </section>

      {o.isPhased && (
        <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
          <h2 className="font-semibold text-basalt">Drops</h2>
          <ol className="mt-2 space-y-3">
            {o.drops.map((d) => (
              <li key={d.id} className="border-t border-basalt/5 pt-2">
                <p className="font-semibold">Drop {d.sequence} · {formatDate(`${d.scheduledFor}T10:00:00Z`)} · <span className="font-mono text-[11px] uppercase text-slate">{DROP_STATUS_LABEL[d.status]}</span></p>
                <p className="text-xs text-slate">{d.lines.map((l) => `${l.quantity} ${unit(l.unitOfSale)} ${l.name}`).join(" · ")}</p>
                {(d.status === "PLANNED" || d.status === "CONFIRMED") && (
                  <ActionForm action={setDropReady} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="dropId" value={d.id} />
                    <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Ready to load on</span><input type="date" name="readyAt" min={today()} defaultValue={d.supplierReadyAt?.slice(0, 10) ?? d.scheduledFor} className={inputClass} /></label>
                    <SubmitButton variant="subtle">Save</SubmitButton>
                  </ActionForm>
                )}
                {(d.status === "CONFIRMED" || d.status === "DISPATCHED") && (
                  <ActionForm action={createPodLink} className="mt-2">
                    <input type="hidden" name="orderId" value={o.id} />
                    <input type="hidden" name="dropId" value={d.id} />
                    <SubmitButton variant="subtle">Driver&apos;s proof-of-delivery link</SubmitButton>
                  </ActionForm>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {open && (
        <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Can you load it?</h2>
          {o.supplierAckAt && <p className="mt-1 font-body text-xs text-emerald-700">You said you can{o.supplierReadyAt ? ` from ${formatDate(o.supplierReadyAt)}` : ""}.</p>}
          {o.supplierDeclinedAt && <p className="mt-1 font-body text-xs text-red-700">You said you can&apos;t{o.supplierNote ? `: ${o.supplierNote}` : ""}.</p>}
          <ActionForm action={respondToOrder} className="mt-3 space-y-3">
            <input type="hidden" name="orderId" value={o.id} />
            <div className="flex flex-wrap gap-4 font-body text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="decision" value="ACCEPT" defaultChecked /> Yes, we can load it</label>
              <label className="flex items-center gap-2"><input type="radio" name="decision" value="DECLINE" /> No, we can&apos;t</label>
            </div>
            {!o.isPhased && <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Ready to load from</span><input type="date" name="readyAt" min={today()} className={inputClass} /></label>}
            <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Note to our team (needed if you can&apos;t)</span><textarea name="note" rows={2} maxLength={1000} className={inputClass} /></label>
            <SubmitButton>Send answer</SubmitButton>
          </ActionForm>
        </section>
      )}

      {!o.isPhased && (o.status === "CONFIRMED" || o.status === "IN_TRANSIT") && (
        <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Proof of delivery</h2>
          <p className="mt-1 font-body text-xs text-slate">Make a link for your driver: the receiver signs on the driver&apos;s phone. A new link replaces the old one.</p>
          <ActionForm action={createPodLink} className="mt-2">
            <input type="hidden" name="orderId" value={o.id} />
            <SubmitButton variant="subtle">Driver&apos;s proof-of-delivery link</SubmitButton>
          </ActionForm>
        </section>
      )}
      {o.proofs.length > 0 && (
        <section className="mt-6 rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
          <h2 className="font-semibold text-basalt">Signed for</h2>
          <ul className="mt-2 space-y-1 text-xs">
            {o.proofs.map((p) => (
              <li key={p.id}>{p.receivedBy} · {formatDate(p.capturedAt)}{p.exceptions ? ` · noted: ${p.exceptions}` : ""}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
