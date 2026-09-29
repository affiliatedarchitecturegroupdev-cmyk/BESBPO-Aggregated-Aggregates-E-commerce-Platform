import Link from "next/link";
import { ReorderButton } from "@/components/account/ReorderButton";
import { formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, UNIT_LABEL, type OrderRecord } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";

/** The downloadable PDFs an order has right now. */
export function orderDocuments(order: OrderRecord) {
  const base = `/api/orders/${order.id}/documents`;
  return [
    { href: `${base}/confirmation`, label: "Order confirmation (PDF)" },
    ...(order.shipment && (order.status === "IN_TRANSIT" || order.status === "DELIVERED") ? [{ href: `${base}/delivery-note`, label: "Delivery note (PDF)" }] : []),
    ...(order.invoice ? [{ href: `${base}/invoice`, label: `Tax invoice ${order.invoice.invoiceNumber}${order.invoice.status === "VOID" ? " (void)" : ""} (PDF)` }] : []),
  ];
}

/** One order in the customer's history: what, where, status, documents and next actions. */
export function OrderCard({ order }: { order: OrderRecord }) {
  return (
    <li className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p>
            <Link href={`/orders/${order.id}/confirmation`} className="font-mono text-xs text-seam-blue hover:underline">{order.orderNumber}</Link>
            <span className="ml-2 text-xs text-slate">{formatDate(order.createdAt)}</span>
          </p>
          <p className="mt-1 text-basalt">
            {order.lineItems.map((l) => `${l.quantity ?? ""} ${l.unitOfSale ? UNIT_LABEL[l.unitOfSale] : ""} ${l.product.name}`.replace(/\s+/g, " ").trim()).join(" · ")}
          </p>
          {order.deliveryAddress && <p className="mt-1 text-xs text-slate">To {order.deliveryAddress}</p>}
        </div>
        <div className="text-right">
          <span className={`rounded-sm px-2 py-0.5 font-mono text-[11px] ${ORDER_STATUS_STYLE[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
          <p className="mt-1 font-semibold text-basalt">{formatZAR(Number(order.total))}</p>
        </div>
      </div>

      {order.shipment?.trackingRef && order.status === "IN_TRANSIT" && (
        <p className="mt-2 text-xs text-slate">
          With {order.shipment.carrier === "BESFLEET" ? "Besfleet" : (order.shipment.externalPartnerName ?? "our delivery partner")} · tracking {order.shipment.trackingRef}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {orderDocuments(order).map((d) => (
          <a key={d.href} href={d.href} target="_blank" rel="noopener" className="text-seam-blue hover:underline">{d.label}</a>
        ))}
        {order.documents.map((doc) => (
          <a key={doc.id} href={`/api/documents/${doc.id}`} target="_blank" rel="noopener" className="text-seam-blue hover:underline">
            {doc.title}
            {doc.batchReference && <span className="text-slate"> · batch {doc.batchReference}</span>}
          </a>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-2 border-t border-basalt/5 pt-3">
        {order.status === "PENDING" && (
          <Link href={`/orders/${order.id}/confirmation`} className="rounded-sm bg-seam-blue px-3 py-1.5 text-xs font-semibold text-limestone hover:bg-basalt">
            Pay now
          </Link>
        )}
        {order.status !== "CANCELLED" && (
          <Link href={`/orders/${order.id}/tracking`} className="rounded-sm border border-basalt/20 px-3 py-1.5 text-xs font-semibold text-basalt hover:border-seam-blue">
            Track
          </Link>
        )}
        <Link href={`/orders/${order.id}/confirmation`} className="rounded-sm border border-basalt/20 px-3 py-1.5 text-xs font-semibold text-basalt hover:border-seam-blue">
          Details
        </Link>
        <ReorderButton lines={order.lineItems.map((l) => ({ sku: l.product.sku, unitOfSale: l.unitOfSale, quantity: l.quantity, name: l.product.name }))} />
      </div>
    </li>
  );
}
