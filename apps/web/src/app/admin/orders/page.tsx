import Link from "next/link";
import { issueInvoice, updateOrderStatus } from "@/app/account/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { api } from "@/lib/api";
import { formatDate, UNIT_LABEL, type InvoiceSummary, type OrderRecord } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Orders" };

type StaffOrder = OrderRecord & {
  deliveryAddress: string | null;
  deliveryProvince: string | null;
  deliveryDistanceKm: number | null;
  distanceSource: "LOCATION" | "CUSTOMER" | null;
  contactPhone: string | null;
  notes: string | null;
  user: { email: string; name: string | null } | null;
  company: { name: string } | null;
  invoice: InvoiceSummary | null;
};

const STATUSES = ["PENDING", "CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;
const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  PENDING: "Awaiting payment",
  CONFIRMED: "Confirmed",
  IN_TRANSIT: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
const NEXT: Record<(typeof STATUSES)[number], (typeof STATUSES)[number][]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/**
 * Checkout orders: confirm once paid (or once an EFT / purchase order is
 * reconciled), dispatch with the carrier and tracking reference the
 * customer sees, and mark delivered.
 */
export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = STATUSES.find((s) => s === searchParams.status) ?? "PENDING";
  const token = sessionToken();
  const [result, invoicing] = await Promise.all([
    api<StaffOrder[]>(`/orders?status=${status}`, { token }),
    api<{ ready: boolean; problems: string[] }>("/orders/invoicing-status", { token }),
  ]);
  const invoicingReady = invoicing.ok && invoicing.data.ready;
  return (
    <section>
      <div className="flex flex-wrap gap-2 font-mono text-[11px]">
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/orders?status=${s}`} className={`rounded-sm px-2.5 py-1 ${s === status ? "bg-basalt text-limestone" : "bg-white text-slate"}`}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>
      {invoicing.ok && !invoicing.data.ready && status !== "CANCELLED" && (
        <p className="mt-4 rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-3 font-body text-xs text-basalt">
          Tax invoices can&apos;t be issued yet. {invoicing.data.problems.join(" ")} (Set these on the API service — see docs/deployment/render.md.)
        </p>
      )}
      {!result.ok ? (
        <p className="mt-4 font-body text-sm text-slate">{result.message}</p>
      ) : result.data.length === 0 ? (
        <p className="mt-4 font-body text-sm text-slate">No orders here.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {result.data.map((order) => (
            <li key={order.id} className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <p>
                  <Link href={`/orders/${order.id}/confirmation`} className="font-mono text-xs text-seam-blue hover:underline">{order.orderNumber}</Link>{" "}
                  <span className="font-semibold text-basalt">{order.company?.name ?? order.user?.name ?? order.user?.email}</span>
                </p>
                <p className="font-mono text-[11px] text-slate">
                  {formatDate(order.createdAt)} · {formatZAR(Number(order.total))} · {STATUS_LABEL[order.status]}
                </p>
              </div>
              <p className="mt-1 text-slate">
                {order.user?.email}
                {order.contactPhone && ` · ${order.contactPhone}`}
              </p>
              <p className="text-slate">
                Deliver to {order.deliveryAddress ?? "—"}
                {order.deliveryProvince && `, ${order.deliveryProvince}`}
                {order.deliveryDistanceKm !== null &&
                  ` · ${order.deliveryDistanceKm}km ${order.distanceSource === "LOCATION" ? "(straight line from the customer's pin — confirm road distance)" : "(entered by the customer)"}`}
              </p>
              <ul className="mt-2 text-basalt">
                {order.lineItems.map((line, i) => (
                  <li key={line.id ?? i}>
                    {line.quantity} {line.unitOfSale ? UNIT_LABEL[line.unitOfSale] : ""} — {line.product.name}
                    {line.lineTotal && <span className="text-slate"> · {formatZAR(Number(line.lineTotal))}</span>}
                  </li>
                ))}
              </ul>
              {order.notes && <p className="mt-2 rounded-sm bg-limestone p-2 text-slate">{order.notes}</p>}
              {order.shipment && (
                <p className="mt-2 font-mono text-[11px] text-slate">
                  {order.shipment.carrier === "BESFLEET" ? "Besfleet" : order.shipment.externalPartnerName}
                  {order.shipment.trackingRef && ` · ref ${order.shipment.trackingRef}`}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                <a href={`/api/orders/${order.id}/documents/confirmation`} target="_blank" rel="noopener" className="text-seam-blue hover:underline">Order confirmation</a>
                {order.shipment && (order.status === "IN_TRANSIT" || order.status === "DELIVERED") && (
                  <a href={`/api/orders/${order.id}/documents/delivery-note`} target="_blank" rel="noopener" className="text-seam-blue hover:underline">Delivery note</a>
                )}
                {order.invoice ? (
                  <a href={`/api/orders/${order.id}/documents/invoice`} target="_blank" rel="noopener" className="text-seam-blue hover:underline">
                    Tax invoice {order.invoice.invoiceNumber} ({order.invoice.status.toLowerCase()})
                  </a>
                ) : (
                  order.status !== "CANCELLED" &&
                  invoicingReady && (
                    <ActionForm action={issueInvoice} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={order.id} />
                      <SubmitButton variant="subtle">Issue tax invoice</SubmitButton>
                    </ActionForm>
                  )
                )}
              </div>
              {NEXT[order.status].length > 0 && (
                <ActionForm action={updateOrderStatus} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr_1fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={order.id} />
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Move to</span>
                    <select name="status" className={inputClass}>
                      {NEXT[order.status].map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Carrier (on dispatch)</span>
                    <select name="carrier" defaultValue={order.shipment?.carrier ?? ""} className={inputClass}>
                      <option value="">—</option>
                      <option value="BESFLEET">Besfleet</option>
                      <option value="EXTERNAL_PARTNER">External partner</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Partner name</span>
                    <input name="externalPartnerName" defaultValue={order.shipment?.externalPartnerName ?? ""} className={inputClass} />
                  </label>
                  <label className="block">
                    <span className="font-mono text-[10px] uppercase text-slate">Tracking ref</span>
                    <input name="trackingRef" defaultValue={order.shipment?.trackingRef ?? ""} className={inputClass} />
                  </label>
                  <SubmitButton>Update</SubmitButton>
                  <p className="font-mono text-[10px] text-slate sm:col-span-full">A status change emails the buyer (and WhatsApps them, if they opted in).</p>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
