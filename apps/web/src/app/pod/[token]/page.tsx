import type { Metadata } from "next";
import { PodForm } from "@/components/delivery/PodForm";
import { api } from "@/lib/api";
import { formatDate, UNIT_LABEL } from "@/lib/account-types";

export const metadata: Metadata = { title: "Proof of delivery", robots: { index: false, follow: false } };

type PodView = {
  orderNumber: string;
  drop: { sequence: number; of: number; scheduledFor: string } | null;
  lines: { name: string; quantity: number; unitOfSale: string | null }[];
  ready: boolean;
  note: string | null;
};

/**
 * The driver's page (docs/deliveries.md): opened from the link our team or
 * the supplier sends, no sign-in. It shows only the order number and what's
 * being delivered — no customer name, address or contact details.
 */
export default async function ProofOfDeliveryPage({ params }: { params: { token: string } }) {
  const result = await api<PodView>(`/pod/${encodeURIComponent(params.token)}`);
  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="font-mono text-xs uppercase text-slate">Aggregated Aggregates · proof of delivery</p>
      {!result.ok ? (
        <p className="mt-4 rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-basalt">{result.message}</p>
      ) : (
        <>
          <h1 className="mt-2 font-display text-2xl font-bold text-basalt">
            Order <span className="font-mono">{result.data.orderNumber}</span>
            {result.data.drop && <span className="block font-body text-base font-normal text-slate">Delivery {result.data.drop.sequence} of {result.data.drop.of} · {formatDate(`${result.data.drop.scheduledFor}T10:00:00Z`)}</span>}
          </h1>
          <ul className="mt-4 rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-basalt">
            {result.data.lines.map((l, i) => (
              <li key={i}>
                {l.quantity} {l.unitOfSale ? (UNIT_LABEL[l.unitOfSale as keyof typeof UNIT_LABEL] ?? "") : ""} — {l.name}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {result.data.ready ? <PodForm token={params.token} /> : <p className="rounded-sm border border-ochre-gold/50 bg-ochre-gold/10 p-4 font-body text-sm text-basalt">{result.data.note}</p>}
          </div>
          <p className="mt-6 font-body text-[11px] text-slate">
            The receiver&apos;s name, signature, the photo and the location are kept with the order as proof of delivery, and seen only by the customer, our
            team and the supplier — see our <a href="/legal/privacy-policy" className="text-seam-blue hover:underline">privacy policy</a>.
          </p>
        </>
      )}
    </div>
  );
}
