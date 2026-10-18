import Link from "next/link";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { DROP_STATUS_LABEL, type DropStatus } from "@/lib/phase4";
import { formatZAR } from "@/lib/pricing";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Deliveries" };

type Upcoming = {
  id: string;
  sequence: number;
  scheduledFor: string;
  overdue: boolean;
  status: DropStatus;
  value: number;
  supplierReadyAt: string | null;
  order: { id: string; orderNumber: string; status: string; province: string | null; paymentPlan: string; balance: number; customer: string | null; supplier: string | null };
};

/** Staff: phased-delivery drops due in the next 30 days (and any on the road), soonest first. */
export default async function DeliveriesCalendarPage() {
  const result = await api<Upcoming[]>("/deliveries/upcoming?days=30", { token: sessionToken() });
  if (!result.ok) return <p className="font-body text-sm text-slate">{result.message}</p>;
  const byDay = new Map<string, Upcoming[]>();
  for (const d of result.data) byDay.set(d.scheduledFor, [...(byDay.get(d.scheduledFor) ?? []), d]);
  return (
    <div className="space-y-4">
      <h2 className="font-body text-sm font-semibold text-basalt">Drops due — next 30 days</h2>
      {result.data.length === 0 && <p className="font-body text-sm text-slate">No phased-delivery drops due.</p>}
      {[...byDay.entries()].map(([day, drops]) => (
        <section key={day} className="rounded-sm border border-basalt/10 bg-white p-4">
          <h3 className="font-mono text-xs uppercase text-slate">{formatDate(`${day}T10:00:00Z`)}</h3>
          <ul className="mt-2 divide-y divide-basalt/5 font-body text-sm">
            {drops.map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                <span>
                  <Link href={`/admin/orders/${d.order.id}/deliveries`} className="font-mono text-seam-blue hover:underline">{d.order.orderNumber}</Link> · drop {d.sequence} · {d.order.customer ?? "—"}
                  {d.order.province ? ` · ${d.order.province}` : ""}
                  {d.order.supplier ? ` · ${d.order.supplier}` : " · no supplier"}
                </span>
                <span className={`font-mono text-[11px] ${d.overdue ? "text-red-700" : "text-slate"}`}>
                  {DROP_STATUS_LABEL[d.status]}{d.overdue ? " · late" : ""} · {formatZAR(d.value)}
                  {d.order.paymentPlan !== "ACCOUNT" && d.order.balance > 0.01 ? ` · ${formatZAR(d.order.balance)} unpaid` : ""}
                  {d.supplierReadyAt ? ` · ready ${formatDate(d.supplierReadyAt)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
