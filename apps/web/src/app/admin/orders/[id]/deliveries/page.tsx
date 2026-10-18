import Link from "next/link";
import { assignSupplier, updateDrop } from "@/app/admin/deliveries/actions";
import { createPodLink } from "@/app/suppliers/portal/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { DeliveryPlanEditor } from "@/components/delivery/DeliveryPlanEditor";
import { DropList, ProofSummary } from "@/components/delivery/DropList";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { DROP_STATUS_LABEL, type Deliveries } from "@/lib/phase4";
import { formatZAR } from "@/lib/pricing";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Order deliveries" };

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  amountPaid: string;
  paymentPlan: string;
  fulfilledBySupplierId: string | null;
  supplierAckAt: string | null;
  supplierReadyAt: string | null;
  supplierDeclinedAt: string | null;
  supplierNote: string | null;
  deliveryProvince: string | null;
};
type SupplierOption = { id: string; name: string; town: string | null; province: string | null };

/** Staff: an order's deliveries — the supplier loading it, the phased plan and each drop, and proof of delivery. */
export default async function OrderDeliveriesPage({ params }: { params: { id: string } }) {
  const token = sessionToken();
  const [d, o, suppliers] = await Promise.all([
    api<Deliveries>(`/deliveries/orders/${encodeURIComponent(params.id)}`, { token }),
    api<OrderDetail>(`/orders/${encodeURIComponent(params.id)}`, { token }),
    api<SupplierOption[]>("/suppliers?filter=active", { token }),
  ]);
  if (!d.ok || !o.ok) return <p className="font-body text-sm text-slate">{!d.ok ? d.message : !o.ok ? o.message : ""}</p>;
  const deliveries = d.data;
  const order = o.data;
  const balance = Math.max(0, Number(order.total) - Number(order.amountPaid));
  const supplierName = (suppliers.ok ? suppliers.data : []).find((s) => s.id === order.fulfilledBySupplierId)?.name;
  const closed = order.status === "CANCELLED" || order.status === "DELIVERED";
  return (
    <div className="space-y-6">
      <p className="font-body text-sm"><Link href="/admin/orders" className="text-seam-blue hover:underline">← Orders</Link></p>
      <section className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
        <h2 className="font-semibold text-basalt">{deliveries.orderNumber} · {deliveries.isPhased ? "phased delivery" : "single delivery"} · {order.status}</h2>
        <p className="mt-1 text-slate">
          {order.paymentPlan === "ACCOUNT" ? "On trade account — drops aren't held for payment." : balance > 0.01 ? `${formatZAR(balance)} still to pay. Each drop leaves once payments cover it.` : "Paid in full."}{" "}
          <Link href={`/admin/orders/${order.id}/payments`} className="text-seam-blue hover:underline">Payments →</Link>
        </p>
      </section>

      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">Supplier</h2>
        <p className="mt-1 font-body text-xs text-slate">
          {supplierName ? `Loading at ${supplierName}. ` : "No supplier assigned yet. "}
          {order.supplierDeclinedAt ? <span className="text-red-700">Declined{order.supplierNote ? `: ${order.supplierNote}` : ""} — assign another.</span> : order.supplierAckAt ? <span className="text-emerald-700">Accepted{order.supplierReadyAt ? `, ready ${formatDate(order.supplierReadyAt)}` : ""}{order.supplierNote ? ` — ${order.supplierNote}` : ""}.</span> : supplierName ? "Waiting for its answer in the supplier portal." : ""}
        </p>
        {!closed && (
          <ActionForm action={assignSupplier} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="orderId" value={order.id} />
            <label className="block min-w-[16rem] flex-1">
              <span className="font-mono text-[10px] uppercase text-slate">Supplier</span>
              <select name="supplierId" defaultValue={order.fulfilledBySupplierId ?? ""} required className={inputClass}>
                <option value="">—</option>
                {(suppliers.ok ? suppliers.data : []).map((s) => <option key={s.id} value={s.id}>{s.name}{s.town ? ` — ${s.town}` : ""}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 font-body text-xs"><input type="checkbox" name="notify" defaultChecked /> Email its portal logins</label>
            <SubmitButton variant="subtle">Assign</SubmitButton>
          </ActionForm>
        )}
      </section>

      {deliveries.isPhased ? (
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Drops</h2>
          <div className="mt-3"><DropList deliveries={deliveries} showValues /></div>
          <div className="mt-4 space-y-4">
            {deliveries.drops.filter((x) => x.status !== "DELIVERED" && x.status !== "CANCELLED").map((x) => (
              <div key={x.id} className="rounded-sm border border-basalt/10 p-3">
                <p className="font-body text-xs font-semibold text-basalt">Drop {x.sequence} · {DROP_STATUS_LABEL[x.status]}</p>
                <div className="mt-2 flex flex-wrap items-end gap-3">
                  {x.status === "PLANNED" && (
                    <ActionForm action={updateDrop} className="flex items-end gap-2">
                      <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="dropId" value={x.id} /><input type="hidden" name="status" value="CONFIRMED" />
                      <SubmitButton variant="subtle">Confirm date with supplier</SubmitButton>
                    </ActionForm>
                  )}
                  {(x.status === "PLANNED" || x.status === "CONFIRMED") && (
                    <>
                      <ActionForm action={updateDrop} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="dropId" value={x.id} />
                        <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Move to</span><input type="date" name="scheduledFor" defaultValue={x.scheduledFor} className={inputClass} /></label>
                        <SubmitButton variant="subtle">Reschedule</SubmitButton>
                      </ActionForm>
                      <ActionForm action={updateDrop} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="dropId" value={x.id} /><input type="hidden" name="status" value="DISPATCHED" />
                        <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Carrier</span>
                          <select name="carrier" className={inputClass} defaultValue="BESFLEET"><option value="BESFLEET">Besfleet</option><option value="EXTERNAL_PARTNER">External partner</option></select>
                        </label>
                        <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Partner name</span><input name="externalPartnerName" maxLength={120} className={inputClass} /></label>
                        <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Tracking ref</span><input name="trackingRef" maxLength={120} className={inputClass} /></label>
                        <SubmitButton>Dispatch</SubmitButton>
                      </ActionForm>
                    </>
                  )}
                  {x.status === "DISPATCHED" && (
                    <ActionForm action={updateDrop} className="flex items-end gap-2">
                      <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="dropId" value={x.id} /><input type="hidden" name="status" value="DELIVERED" />
                      <SubmitButton variant="subtle">Mark delivered (no signature)</SubmitButton>
                    </ActionForm>
                  )}
                  {(x.status === "CONFIRMED" || x.status === "DISPATCHED") && (
                    <ActionForm action={createPodLink}>
                      <input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="dropId" value={x.id} />
                      <SubmitButton variant="subtle">{x.podLinkOpen ? "New driver link" : "Driver's POD link"}</SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">Proof of delivery</h2>
          {deliveries.proof ? (
            <ProofSummary proof={deliveries.proof} />
          ) : (order.status === "CONFIRMED" || order.status === "IN_TRANSIT") ? (
            <>
              <p className="mt-1 font-body text-xs text-slate">Make a link for the driver: the receiver signs on the driver&apos;s phone and the order is marked delivered. Dispatch the order (Orders) before it&apos;s signed.</p>
              <ActionForm action={createPodLink} className="mt-2">
                <input type="hidden" name="orderId" value={order.id} />
                <SubmitButton variant="subtle">{deliveries.podLinkOpen ? "New driver link" : "Driver's POD link"}</SubmitButton>
              </ActionForm>
            </>
          ) : (
            <p className="mt-1 font-body text-xs text-slate">Available once the order is confirmed.</p>
          )}
        </section>
      )}

      {deliveries.canPlan && (
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">{deliveries.isPhased ? "Change the plan" : "Split into phased deliveries"}</h2>
          <p className="mt-1 font-body text-xs text-slate">Agree any extra delivery charge with the customer first (by quote) — the plan itself doesn&apos;t change the order total.</p>
          <div className="mt-3"><DeliveryPlanEditor deliveries={deliveries} /></div>
        </section>
      )}
    </div>
  );
}
