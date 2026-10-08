import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelBooking, confirmBookingPayment, redispatchBooking, resolveDispute, staffBookingMessage } from "@/app/admin/bookings/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { Chat, JobCards, label, panel, StatusPill } from "@/components/bookings/BookingParts";
import { api } from "@/lib/api";
import type { AdminBooking } from "@/lib/admin-bookings";
import { bookingDate, dateRange, dateTime, PAYOUT_STATUS_LABEL, quantityLabel } from "@/lib/bookings";
import { formatZAR } from "@/lib/pricing";
import { getSession, sessionToken } from "@/lib/session";
import { setTestFlag } from "@/app/admin/finance/actions";
import { RefundPanel } from "@/components/finance/RefundPanel";

export const metadata = { title: "Booking" };

const CANCELLABLE = ["QUOTED", "AWAITING_PAYMENT", "DISPATCHING", "ACCEPTED", "UNFULFILLED", "DISPUTED"];
const OFFER_LABEL = { PENDING: "Waiting", ACCEPTED: "Accepted", DECLINED: "Declined", EXPIRED: "Expired", WITHDRAWN: "Withdrawn" } as const;

export default async function AdminBookingPage({ params }: { params: { id: string } }) {
  const [result, user] = await Promise.all([api<AdminBooking>(`/bookings/admin/${encodeURIComponent(params.id)}`, { token: sessionToken() }), getSession()]);
  if (!result.ok) notFound();
  const b = result.data;
  const isAdmin = user?.role === "ADMIN";
  const openDisputes = b.disputes.filter((d) => d.status === "OPEN");
  return (
    <div className="space-y-5">
      <Link href="/admin/bookings" className="font-mono text-xs text-slate hover:text-seam-blue">← Bookings</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate">{b.reference}{b.enquiryId ? " · from an enquiry" : ""}</p>
          <h2 className="font-display text-xl font-bold text-basalt">{b.itemName}</h2>
        </div>
        <div className="flex items-center gap-3">
          {b.isTest && <span className="rounded-sm bg-ochre-gold/20 px-1.5 py-0.5 font-mono text-[10px] uppercase text-basalt">Test — not reported</span>}
          {isAdmin && (
            <form action={setTestFlag}>
              <input type="hidden" name="kind" value="booking" />
              <input type="hidden" name="id" value={b.id} />
              <input type="hidden" name="isTest" value={String(!b.isTest)} />
              <button className="font-body text-xs text-seam-blue hover:underline">{b.isTest ? "Include in reporting" : "Mark as test"}</button>
            </form>
          )}
          <StatusPill status={b.status} />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="min-w-0 space-y-5">
          <section className={panel}>
            <dl className="grid gap-3 font-body text-sm sm:grid-cols-2">
              {[
                ["Customer", `${b.user.name ?? ""} ${b.user.email}`.trim()],
                ["What", `${b.sku} — ${quantityLabel(b.basis, b.quantity)}`],
                ["When", dateRange(b.startDate, b.endDate)],
                ["Where", `${b.siteAddress}, ${b.province}`],
                ["Customer total", formatZAR(Number(b.customerTotal))],
                ["Partner amount", `${formatZAR(Number(b.partnerAmount))} (+${Number(b.commissionPercent)}% commission)`],
                ["Quote source", b.quoteSource],
                ["Quote valid until", b.quoteValidUntil ? bookingDate(b.quoteValidUntil) : "—"],
                ["Quoting partner", b.preferredPartner?.name ?? "—"],
                ["Assigned partner", b.assignedPartner ? `${b.assignedPartner.name} · ${b.assignedPartner.contactEmail}${b.assignedPartner.contactPhone ? ` · ${b.assignedPartner.contactPhone}` : ""}` : "—"],
                ["Payment", b.paidAt ? `${dateTime(b.paidAt)} · ${b.paymentReference}` : "—"],
                ["Arrival code", b.status === "ACCEPTED" ? (b.hasArrivalCode ? `Opened by customer${b.otpFailures ? ` · ${b.otpFailures} wrong attempt(s)` : ""}` : "Not opened yet") : "—"],
                ...(b.customerRating ? [["Customer rating", "★".repeat(b.customerRating)]] : []),
                ...(b.cancelledReason ? [["Cancelled", b.cancelledReason]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className={label}>{k}</dt>
                  <dd className="mt-0.5 break-words text-basalt">{v}</dd>
                </div>
              ))}
            </dl>
            {b.siteNotes && <p className="mt-3 font-body text-xs text-slate">Site notes: {b.siteNotes}</p>}
          </section>

          {b.status === "AWAITING_PAYMENT" && (
            <section className={panel}>
              <h3 className="font-display text-base font-semibold text-basalt">Confirm the customer&apos;s EFT</h3>
              <p className="mt-1 font-body text-xs text-slate">Only once {formatZAR(Number(b.customerTotal))} has cleared with reference {b.reference}. Confirming starts dispatch.</p>
              <ActionForm action={confirmBookingPayment} className="mt-3 flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={b.id} />
                <input name="paymentReference" required minLength={3} placeholder="Bank statement reference" className={`${inputClass} max-w-xs`} />
                <SubmitButton>Payment received</SubmitButton>
              </ActionForm>
            </section>
          )}

          {b.status === "UNFULFILLED" && (
            <section className={panel}>
              <h3 className="font-display text-base font-semibold text-basalt">No partner accepted</h3>
              <p className="mt-1 font-body text-xs text-slate">Add a partner or fleet for {b.sku} in {b.province} and re-dispatch, or cancel and refund the customer.</p>
              <ActionForm action={redispatchBooking} className="mt-3">
                <input type="hidden" name="id" value={b.id} />
                <SubmitButton>Re-dispatch to partners not yet offered</SubmitButton>
              </ActionForm>
            </section>
          )}

          {openDisputes.map((d) => (
            <section key={d.id} className="rounded-sm border border-red-700/30 bg-red-50 p-5">
              <h3 className="font-display text-base font-semibold text-basalt">Open dispute — raised by {d.raisedBy.toLowerCase()}</h3>
              <p className="mt-1 font-body text-sm text-basalt">{d.reason}</p>
              <ActionForm action={resolveDispute} className="mt-3 space-y-2">
                <input type="hidden" name="disputeId" value={d.id} />
                <textarea name="resolution" required minLength={5} rows={2} placeholder="What was agreed (shown to both sides)" className={inputClass} />
                <div className="flex flex-wrap gap-4 font-body text-sm">
                  <label className="flex items-center gap-2"><input type="radio" name="outcome" value="PAY_PARTNER" required /> Pay the partner</label>
                  <label className="flex items-center gap-2"><input type="radio" name="outcome" value="REFUND_CUSTOMER" /> Refund the customer (cancel payout)</label>
                </div>
                <SubmitButton>Resolve</SubmitButton>
              </ActionForm>
            </section>
          ))}

          <section className={panel}>
            <h3 className="font-display text-base font-semibold text-basalt">Dispatch</h3>
            {b.offers.length === 0 ? (
              <p className="mt-2 font-body text-sm text-slate">Not dispatched yet — dispatch starts when payment is confirmed.</p>
            ) : (
              <ol className="mt-2 space-y-1 font-body text-sm">
                {b.offers.map((o) => (
                  <li key={o.id} className="flex flex-wrap justify-between gap-2 rounded-sm bg-limestone/60 px-3 py-1.5">
                    <span>{o.rank + 1}. {o.partner.name}</span>
                    <span className="font-mono text-[11px] text-slate">{OFFER_LABEL[o.status]} · offered {dateTime(o.offeredAt)}{o.status === "PENDING" ? ` · closes ${dateTime(o.expiresAt)}` : ""}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {b.payout && (
            <section className={panel}>
              <h3 className="font-display text-base font-semibold text-basalt">Partner payout</h3>
              <p className="mt-1 font-body text-sm text-basalt">
                {formatZAR(Number(b.payout.amount))} — {PAYOUT_STATUS_LABEL[b.payout.status]}
                {b.payout.status === "HELD" && b.payout.releaseAfter ? ` until ${dateTime(b.payout.releaseAfter)}` : ""}
                {b.payout.paidAt ? ` · paid ${bookingDate(b.payout.paidAt)} (${b.payout.paidReference})` : ""}
              </p>
              {b.payout.status === "DUE" && <Link href="/admin/bookings?view=payouts" className="mt-2 inline-block font-body text-xs text-seam-blue hover:underline">Record the EFT on Partner payouts →</Link>}
            </section>
          )}

          {b.paidAt && <RefundPanel target={{ bookingId: b.id }} paidTotal={Number(b.customerTotal)} refunds={b.refunds} isAdmin={isAdmin} />}

          <JobCards cards={b.jobCards} />

          {CANCELLABLE.includes(b.status) && (
            <details className={panel}>
              <summary className="cursor-pointer font-display text-base font-semibold text-basalt">Cancel booking</summary>
              <p className="mt-2 font-body text-xs text-slate">Withdraws open offers and frees the partner&apos;s dates. Refund any payment by EFT and note it here.</p>
              <ActionForm action={cancelBooking} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={b.id} />
                <textarea name="reason" required minLength={5} rows={2} placeholder="Reason (shown to the customer)" className={inputClass} />
                <SubmitButton variant="subtle">Cancel booking</SubmitButton>
              </ActionForm>
            </details>
          )}
        </div>
        <Chat messages={b.messages} me="STAFF" open bookingId={b.id} action={staffBookingMessage} />
      </div>
    </div>
  );
}
