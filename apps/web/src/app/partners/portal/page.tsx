import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blockDates, respondToOffer, unblockDates } from "@/app/partners/portal/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { label, panel, StatusPill } from "@/components/bookings/BookingParts";
import { api } from "@/lib/api";
import { bookingDate, dateRange, PAYOUT_STATUS_LABEL, quantityLabel, type BookingBasis, type BookingStatus, type PayoutStatus } from "@/lib/bookings";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Partner Portal", robots: { index: false } };
export const dynamic = "force-dynamic";

type Portal = {
  partner: {
    id: string;
    name: string;
    province: string;
    status: "ONBOARDING" | "ACTIVE" | "SUSPENDED";
    payoutDetailsConfirmed: boolean;
    fleet: { id: string; sku: string; label: string; province: string; isActive: boolean; availability: { id: string; startsOn: string; endsOn: string; reason: string | null; bookingId: string | null }[] }[];
  };
  offers: {
    id: string;
    expiresAt: string;
    booking: { reference: string; itemName: string; basis: BookingBasis; quantity: number; startDate: string; endDate: string; province: string; siteAddress: string; siteNotes: string | null; partnerAmount: string };
  }[];
  jobs: { id: string; reference: string; itemName: string; status: BookingStatus; startDate: string; endDate: string; province: string; siteAddress: string; partnerAmount: string }[];
  payouts: { id: string; amount: string; status: PayoutStatus; releaseAfter: string | null; paidAt: string | null; paidReference: string | null; booking: { reference: string; itemName: string } }[];
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" });

/**
 * The partner portal: paid job offers (30 minutes to reply), assigned jobs,
 * the fleet calendar and payouts. Customer contact details are never shown —
 * talk to the customer through each job's chat.
 */
export default async function PartnerPortalPage() {
  const user = await requireSession("/partners/portal");
  if (user.role !== "PARTNER") notFound();
  const result = await api<Portal>("/partner-portal", { token: sessionToken() });
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-2xl font-bold text-basalt">Partner portal</h1>
        <p className="mt-3 font-body text-sm text-slate">{result.message}</p>
      </div>
    );
  }
  const { partner, offers, jobs, payouts } = result.data;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">Partner portal</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-basalt">{partner.name}</h1>
        </div>
        <p className="font-mono text-xs text-slate">{partner.province} · {partner.status === "ACTIVE" ? "Receiving offers" : partner.status === "ONBOARDING" ? "Onboarding — no offers yet" : "Suspended"}</p>
      </div>
      {!partner.payoutDetailsConfirmed && (
        <p className="mt-4 rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-3 font-body text-sm text-basalt">
          We still need your bank confirmation letter before we can pay you out. Send it to our partnerships team.
        </p>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold text-basalt">Job offers</h2>
        <p className="mt-1 font-body text-xs text-slate">Every offer is already paid by the customer. Reply within 30 minutes, or it goes to the next partner.</p>
        {offers.length === 0 ? (
          <p className="mt-4 font-body text-sm text-slate">No open offers right now. We&apos;ll email you when one comes in.</p>
        ) : (
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {offers.map((o) => (
              <li key={o.id} className={`${panel} border-seam-blue/40`} data-offer>
                <p className="font-mono text-[11px] text-slate">{o.booking.reference} · reply by {time(o.expiresAt)}</p>
                <h3 className="mt-1 font-display text-lg font-semibold text-basalt">{o.booking.itemName}</h3>
                <dl className="mt-3 space-y-1 font-body text-sm text-basalt">
                  <div><dt className="inline text-slate">When: </dt><dd className="inline">{dateRange(o.booking.startDate, o.booking.endDate)} ({quantityLabel(o.booking.basis, o.booking.quantity)})</dd></div>
                  <div><dt className="inline text-slate">Where: </dt><dd className="inline">{o.booking.siteAddress}, {o.booking.province}</dd></div>
                  {o.booking.siteNotes && <div><dt className="inline text-slate">Site notes: </dt><dd className="inline">{o.booking.siteNotes}</dd></div>}
                  <div><dt className="inline text-slate">Your payout: </dt><dd className="inline font-semibold">{formatZAR(Number(o.booking.partnerAmount))}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ActionForm action={respondToOffer} className="contents">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="decision" value="accept" />
                    <SubmitButton>Accept job</SubmitButton>
                  </ActionForm>
                  <ActionForm action={respondToOffer} className="contents">
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="decision" value="decline" />
                    <SubmitButton variant="subtle">Decline</SubmitButton>
                  </ActionForm>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-basalt">Your jobs</h2>
        {jobs.length === 0 ? (
          <p className="mt-3 font-body text-sm text-slate">No current jobs.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/partners/portal/jobs/${j.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-basalt/10 bg-white p-4 hover:border-seam-blue">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-slate">{j.reference} · {dateRange(j.startDate, j.endDate)}</p>
                    <p className="mt-1 font-display text-base font-semibold text-basalt">{j.itemName}</p>
                    <p className="font-body text-xs text-slate">{j.siteAddress}, {j.province}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-body text-sm font-semibold text-basalt">{formatZAR(Number(j.partnerAmount))}</span>
                    <StatusPill status={j.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-basalt">Fleet & availability</h2>
        <p className="mt-1 font-body text-xs text-slate">Block dates when a machine is on another job or in for service, so you aren&apos;t offered work you can&apos;t take. Ask us to add or change machines.</p>
        {partner.fleet.length === 0 && <p className="mt-3 font-body text-sm text-slate">No fleet recorded yet — our partnerships team adds it during onboarding.</p>}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {partner.fleet.map((u) => (
            <div key={u.id} className={panel}>
              <p className="font-mono text-[11px] text-slate">{u.sku} · {u.province}{u.isActive ? "" : " · inactive"}</p>
              <h3 className="mt-1 font-display text-base font-semibold text-basalt">{u.label}</h3>
              {u.availability.length > 0 && (
                <ul className="mt-3 space-y-1 font-body text-sm">
                  {u.availability.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-limestone/60 px-3 py-1.5">
                      <span>{dateRange(b.startsOn, b.endsOn)} <span className="text-xs text-slate">{b.reason ?? ""}</span></span>
                      {!b.bookingId && (
                        <form action={unblockDates}>
                          <input type="hidden" name="id" value={b.id} />
                          <button className="font-body text-xs text-slate hover:text-red-700">Remove</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <ActionForm action={blockDates} className="mt-3 grid grid-cols-2 gap-2">
                <input type="hidden" name="unitId" value={u.id} />
                <label className="block"><span className={label}>From</span><input type="date" name="startsOn" min={today} required className={inputClass} /></label>
                <label className="block"><span className={label}>To</span><input type="date" name="endsOn" min={today} required className={inputClass} /></label>
                <label className="col-span-2 block"><span className={label}>Reason (optional)</span><input name="reason" maxLength={200} className={inputClass} /></label>
                <div className="col-span-2"><SubmitButton variant="subtle">Block dates</SubmitButton></div>
              </ActionForm>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-basalt">Payouts</h2>
        <p className="mt-1 font-body text-xs text-slate">A payout is released 48 hours after the customer signs off, unless there&apos;s a dispute, and paid by EFT.</p>
        {payouts.length === 0 ? (
          <p className="mt-3 font-body text-sm text-slate">No payouts yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[32rem] font-body text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase text-slate">
                  <th className="py-1 pr-3">Job</th><th className="py-1 pr-3">Amount</th><th className="py-1 pr-3">Status</th><th className="py-1">Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-basalt/10">
                {payouts.map((p) => (
                  <tr key={p.id} className="text-basalt">
                    <td className="py-2 pr-3">{p.booking.reference} — {p.booking.itemName}</td>
                    <td className="py-2 pr-3">{formatZAR(Number(p.amount))}</td>
                    <td className="py-2 pr-3">{PAYOUT_STATUS_LABEL[p.status]}{p.status === "HELD" && p.releaseAfter ? ` until ${bookingDate(p.releaseAfter)}` : ""}</td>
                    <td className="py-2 text-xs text-slate">{p.paidAt ? `${bookingDate(p.paidAt)} · ${p.paidReference}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
