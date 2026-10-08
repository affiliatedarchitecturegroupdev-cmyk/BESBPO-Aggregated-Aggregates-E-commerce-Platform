import { deleteRefund, recordRefund } from "@/app/admin/finance/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { formatZAR } from "@/lib/pricing";

export type RefundRecord = { id: string; orderId: string | null; bookingId: string | null; amount: string; reason: string; reference: string | null; refundedAt: string };

const label = "block font-mono text-[10px] uppercase text-slate";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

/**
 * Refunds paid back (by EFT, outside the platform) for one paid order or
 * booking. Recording them here keeps revenue reporting net of refunds
 * (ANALYTICS.md). Admins can remove a refund recorded in error.
 */
export function RefundPanel({
  target,
  paidTotal,
  refunds,
  isAdmin,
}: {
  target: { orderId: string } | { bookingId: string };
  paidTotal: number;
  refunds: RefundRecord[];
  isAdmin: boolean;
}) {
  const refunded = refunds.reduce((n, r) => n + Number(r.amount), 0);
  const remaining = Math.max(0, Math.round((paidTotal - refunded) * 100) / 100);
  return (
    <details className="mt-3 rounded-sm border border-basalt/10 bg-limestone/40 p-3 font-body text-xs" open={refunds.length > 0}>
      <summary className="cursor-pointer font-semibold text-basalt">
        Refunds{refunds.length > 0 ? ` — ${formatZAR(refunded)} of ${formatZAR(paidTotal)}` : ""}
      </summary>
      {refunds.length > 0 && (
        <ul className="mt-2 space-y-1">
          {refunds.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-basalt">
                {formatZAR(Number(r.amount))} · {day(r.refundedAt)} · {r.reason}
                {r.reference ? ` · ref ${r.reference}` : ""}
              </span>
              {isAdmin && (
                <form action={deleteRefund}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-slate hover:text-red-700">Remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
      {remaining > 0 ? (
        <ActionForm action={recordRefund} className="mt-3 grid gap-2 sm:grid-cols-[8rem_1fr_9rem_9rem_auto] sm:items-end">
          {"orderId" in target ? <input type="hidden" name="orderId" value={target.orderId} /> : <input type="hidden" name="bookingId" value={target.bookingId} />}
          <label className="block"><span className={label}>Amount (R)</span><input name="amount" type="number" step="0.01" min="0.01" max={remaining} required className={inputClass} /></label>
          <label className="block"><span className={label}>Reason</span><input name="reason" required minLength={3} maxLength={500} className={inputClass} /></label>
          <label className="block"><span className={label}>EFT reference</span><input name="reference" maxLength={120} className={inputClass} /></label>
          <label className="block"><span className={label}>Paid on</span><input name="refundedOn" type="date" className={inputClass} /></label>
          <SubmitButton variant="subtle">Record refund</SubmitButton>
          <p className="text-slate sm:col-span-full">Record a refund once it&apos;s been paid back. Up to {formatZAR(remaining)} remains refundable.</p>
        </ActionForm>
      ) : (
        <p className="mt-2 text-slate">Fully refunded.</p>
      )}
    </details>
  );
}
