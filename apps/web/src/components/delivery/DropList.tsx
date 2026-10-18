import { formatDate, UNIT_LABEL } from "@/lib/account-types";
import { DROP_STATUS_LABEL, type Deliveries, type Proof } from "@/lib/phase4";

const TONE: Record<string, string> = { PLANNED: "text-slate", CONFIRMED: "text-seam-blue", DISPATCHED: "text-ochre-gold", DELIVERED: "text-emerald-700", CANCELLED: "text-slate line-through" };

/** Who signed, when, anything noted, and the signature and photo (served through /api/proofs, which the API guards). */
export function ProofSummary({ proof }: { proof: Proof }) {
  return (
    <div className="mt-2 rounded-sm bg-limestone/60 p-3 font-body text-xs text-basalt">
      <p>
        Signed for by <span className="font-semibold">{proof.receivedBy}</span> · {formatDate(proof.capturedAt)}{" "}
        {new Date(proof.capturedAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" })}
        {proof.location && (
          <>
            {" "}·{" "}
            <a href={`https://www.google.com/maps?q=${proof.location.latitude},${proof.location.longitude}`} target="_blank" rel="noopener noreferrer" className="text-seam-blue hover:underline">
              where it was signed
            </a>
          </>
        )}
      </p>
      {proof.exceptions && <p className="mt-1 text-ochre-gold">Noted on delivery: {proof.exceptions}</p>}
      <div className="mt-2 flex flex-wrap gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {proof.hasSignature && <img src={`/api/proofs/${proof.id}/signature`} alt={`Signature of ${proof.receivedBy}`} className="h-20 rounded-sm border border-basalt/10 bg-white" />}
        {proof.hasPhoto && (
          <a href={`/api/proofs/${proof.id}/photo`} target="_blank" rel="noopener">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/proofs/${proof.id}/photo`} alt="Delivery photo" className="h-20 rounded-sm border border-basalt/10 object-cover" />
          </a>
        )}
      </div>
    </div>
  );
}

export function DropList({ deliveries, showValues = false }: { deliveries: Deliveries; showValues?: boolean }) {
  return (
    <ol className="space-y-3">
      {deliveries.drops.map((d) => (
        <li key={d.id} className="rounded-sm border border-basalt/10 bg-white p-3 font-body text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-basalt">
              Drop {d.sequence} · {formatDate(`${d.scheduledFor}T10:00:00Z`)}
            </p>
            <p className={`font-mono text-[11px] uppercase ${TONE[d.status]}`}>{DROP_STATUS_LABEL[d.status]}</p>
          </div>
          <ul className="mt-1 text-xs text-slate">
            {d.lines.map((l) => (
              <li key={l.lineItemId}>
                {l.quantity} {l.unitOfSale ? (UNIT_LABEL[l.unitOfSale as keyof typeof UNIT_LABEL] ?? "") : ""} — {l.name}
              </li>
            ))}
          </ul>
          {showValues && <p className="mt-1 font-mono text-[11px] text-slate">Materials R{d.value.toFixed(2)}{d.supplierReadyAt ? ` · supplier ready ${formatDate(d.supplierReadyAt)}` : ""}</p>}
          {d.notes && <p className="mt-1 text-xs text-slate">{d.notes}</p>}
          {d.trackingRef && <p className="mt-1 text-xs text-slate">Tracking reference <span className="font-mono">{d.trackingRef}</span></p>}
          {d.proof && <ProofSummary proof={d.proof} />}
        </li>
      ))}
    </ol>
  );
}
