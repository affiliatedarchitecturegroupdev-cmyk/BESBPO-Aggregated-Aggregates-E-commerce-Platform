import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acceptBookingQuote, declineBookingQuote, disputeBooking, sendBookingMessage, signOffBooking } from "@/app/account/bookings/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { ArrivalCode } from "@/components/bookings/ArrivalCode";
import { Chat, Disputes, JobCards, label, panel, StatusPill } from "@/components/bookings/BookingParts";
import { api } from "@/lib/api";
import { bookingDate, dateRange, dateTime, quantityLabel, type CustomerBooking } from "@/lib/bookings";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Booking", robots: { index: false } };

/** What happens next, in the customer's words, for each status. */
const NEXT: Partial<Record<CustomerBooking["status"], string>> = {
  QUOTED: "This price comes from a vetted partner's written quote. Accept it to get the payment details — nothing is booked until it's paid.",
  AWAITING_PAYMENT: "Pay by EFT using the reference below. Once the payment clears we confirm a partner for your dates.",
  DISPATCHING: "Payment received. We're confirming a partner for your dates and will email you as soon as one is assigned.",
  ACCEPTED: "Your partner is confirmed. When the crew arrives, show them your arrival code to start the job.",
  IN_PROGRESS: "The job is under way. Sign it off when the work is done — or raise a dispute if something's wrong.",
  COMPLETED: "Thanks for signing off. If something's wrong you can still raise a dispute until the window closes; after that the partner is paid.",
  CLOSED: "This job is complete and the partner has been paid.",
  DISPUTED: "Our team is looking into the dispute. The partner isn't paid until it's resolved.",
  UNFULFILLED: "None of our partners could take this job on your dates. Our team will contact you to offer other dates or a full refund.",
};

export default async function BookingPage({ params }: { params: { id: string } }) {
  await requireSession(`/account/bookings/${params.id}`);
  const result = await api<CustomerBooking>(`/bookings/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) notFound();
  const b = result.data;
  const windowOpen = b.status === "COMPLETED" && b.disputeWindowEndsAt !== null && new Date(b.disputeWindowEndsAt) > new Date();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/account/bookings" className="font-mono text-xs text-slate hover:text-seam-blue">← My bookings</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate">{b.reference}</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-basalt">{b.itemName}</h1>
        </div>
        <StatusPill status={b.status} />
      </div>
      {NEXT[b.status] && <p className="mt-4 rounded-sm border border-seam-blue/20 bg-seam-blue/5 p-4 font-body text-sm text-basalt">{NEXT[b.status]}</p>}
      {b.cancelledReason && <p className="mt-4 rounded-sm bg-basalt/5 p-4 font-body text-sm text-slate">Cancelled: {b.cancelledReason}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section className={panel}>
            <dl className="grid gap-3 font-body text-sm sm:grid-cols-2">
              {[
                ["What", `${b.itemName} — ${quantityLabel(b.basis, b.quantity)}`],
                ["When", dateRange(b.startDate, b.endDate)],
                ["Where", `${b.siteAddress}, ${b.province}`],
                ["Partner", b.partnerName ?? "Named once confirmed"],
                ["Total", formatZAR(Number(b.customerTotal))],
                ...(b.status === "QUOTED" && b.quoteValidUntil ? [["Quote valid until", bookingDate(b.quoteValidUntil)]] : []),
                ...(b.paidAt ? [["Paid", dateTime(b.paidAt)]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className={label}>{k}</dt>
                  <dd className="mt-0.5 text-basalt">{v}</dd>
                </div>
              ))}
            </dl>
            {b.siteNotes && <p className="mt-4 font-body text-xs text-slate">Site notes: {b.siteNotes}</p>}
          </section>

          {b.status === "QUOTED" && (
            <section className={`${panel} flex flex-wrap items-center gap-3`}>
              <ActionForm action={acceptBookingQuote} className="contents">
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton>Accept quote — {formatZAR(Number(b.customerTotal))}</SubmitButton>
              </ActionForm>
              <ActionForm action={declineBookingQuote} className="contents">
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton variant="subtle">Decline</SubmitButton>
              </ActionForm>
            </section>
          )}

          {b.payment && (
            <section className={panel}>
              <h2 className="font-display text-lg font-semibold text-basalt">Pay by EFT</h2>
              <p className="mt-1 font-body text-sm text-slate">
                Pay {formatZAR(Number(b.customerTotal))} using the reference <strong className="font-mono text-basalt">{b.payment.reference}</strong>, so we can match your payment.
              </p>
              {b.payment.bankingDetails.length > 0 ? (
                <ul className="mt-3 rounded-sm bg-limestone/60 p-3 font-mono text-xs text-basalt">
                  {b.payment.bankingDetails.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 font-body text-sm text-slate">Our team will email you the banking details for this payment.</p>
              )}
            </section>
          )}

          {b.status === "ACCEPTED" && <ArrivalCode bookingId={b.id} />}

          {b.status === "IN_PROGRESS" && (
            <section className={panel}>
              <h2 className="font-display text-lg font-semibold text-basalt">Sign off the job</h2>
              <p className="mt-1 font-body text-sm text-slate">Sign off once the work is done. The partner is paid after a 48-hour window in which you can still raise a dispute.</p>
              <ActionForm action={signOffBooking} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={b.id} />
                <label className="block">
                  <span className={label}>Rate the partner (optional)</span>
                  <select name="rating" defaultValue="" className={inputClass}>
                    <option value="">—</option>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>{"★".repeat(n)}</option>
                    ))}
                  </select>
                </label>
                <SubmitButton>Sign off</SubmitButton>
              </ActionForm>
            </section>
          )}

          {(b.status === "IN_PROGRESS" || windowOpen) && (
            <details className={panel}>
              <summary className="cursor-pointer font-display text-base font-semibold text-basalt">Something wrong? Raise a dispute</summary>
              <p className="mt-2 font-body text-sm text-slate">
                The partner&apos;s payment is held while our team looks into it.
                {windowOpen && b.disputeWindowEndsAt && ` You can raise one until ${dateTime(b.disputeWindowEndsAt)}.`}
              </p>
              <ActionForm action={disputeBooking} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={b.id} />
                <textarea name="reason" required minLength={5} maxLength={2000} rows={3} placeholder="What went wrong?" className={inputClass} />
                <SubmitButton variant="subtle">Raise dispute</SubmitButton>
              </ActionForm>
            </details>
          )}

          <JobCards cards={b.jobCards} />
          <Disputes disputes={b.disputes} />
        </div>
        <Chat messages={b.messages} me="CUSTOMER" open={b.chatOpen} bookingId={b.id} action={sendBookingMessage} />
      </div>
    </div>
  );
}
