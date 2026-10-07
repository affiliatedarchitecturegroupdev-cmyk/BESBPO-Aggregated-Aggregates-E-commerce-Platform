import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addJobCard, partnerDispute, sendPartnerMessage, startJob } from "@/app/partners/portal/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { Chat, Disputes, JobCards, label, panel, StatusPill } from "@/components/bookings/BookingParts";
import { api } from "@/lib/api";
import { dateRange, PAYOUT_STATUS_LABEL, quantityLabel, type BookingBasis, type BookingStatus, type DisputeRecord, type JobCard, type Message, type PayoutStatus } from "@/lib/bookings";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Job", robots: { index: false } };

type PartnerJob = {
  id: string;
  reference: string;
  itemName: string;
  basis: BookingBasis;
  quantity: number;
  startDate: string;
  endDate: string;
  province: string;
  siteAddress: string;
  siteNotes: string | null;
  status: BookingStatus;
  customerFirstName: string;
  partnerAmount: string;
  chatOpen: boolean;
  codeLocked: boolean;
  jobCards: JobCard[];
  messages: Message[];
  disputes: DisputeRecord[];
  payout: { amount: string; status: PayoutStatus; releaseAfter: string | null; paidAt: string | null } | null;
};

export default async function PartnerJobPage({ params }: { params: { id: string } }) {
  const user = await requireSession(`/partners/portal/jobs/${params.id}`);
  if (user.role !== "PARTNER") notFound();
  const result = await api<PartnerJob>(`/partner-portal/jobs/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) notFound();
  const j = result.data;
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/partners/portal" className="font-mono text-xs text-slate hover:text-seam-blue">← Partner portal</Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-slate">{j.reference}</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-basalt">{j.itemName}</h1>
        </div>
        <StatusPill status={j.status} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="min-w-0 space-y-6">
          <section className={panel}>
            <dl className="grid gap-3 font-body text-sm sm:grid-cols-2">
              {[
                ["When", `${dateRange(j.startDate, j.endDate)} (${quantityLabel(j.basis, j.quantity)})`],
                ["Site", `${j.siteAddress}, ${j.province}`],
                ["Customer", j.customerFirstName],
                ["Your payout", `${formatZAR(Number(j.partnerAmount))}${j.payout ? ` — ${PAYOUT_STATUS_LABEL[j.payout.status].toLowerCase()}` : ""}`],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className={label}>{k}</dt>
                  <dd className="mt-0.5 text-basalt">{v}</dd>
                </div>
              ))}
            </dl>
            {j.siteNotes && <p className="mt-4 font-body text-xs text-slate">Site notes: {j.siteNotes}</p>}
          </section>

          {j.status === "ACCEPTED" && (
            <section className="rounded-sm border-2 border-seam-blue/30 bg-seam-blue/5 p-5">
              <h2 className="font-display text-lg font-semibold text-basalt">Start the job</h2>
              <p className="mt-1 font-body text-sm text-slate">On arrival, ask {j.customerFirstName} to open their booking and read you the 6-digit arrival code.</p>
              {j.codeLocked ? (
                <p className="mt-3 font-body text-sm text-red-800">Too many wrong codes — ask the customer to open a new code in their booking.</p>
              ) : null}
              <ActionForm action={startJob} className="mt-4 flex flex-wrap items-end gap-3">
                <input type="hidden" name="id" value={j.id} />
                <label className="block">
                  <span className={label}>Arrival code</span>
                  <input name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" className={`${inputClass} w-40 font-mono text-lg tracking-[0.3em]`} />
                </label>
                <SubmitButton>Start job</SubmitButton>
              </ActionForm>
            </section>
          )}

          {j.status === "IN_PROGRESS" && (
            <section className={panel}>
              <h2 className="font-display text-lg font-semibold text-basalt">Add a job card</h2>
              <p className="mt-1 font-body text-xs text-slate">Record each day: hours, hour-meter readings or loads. The customer sees these.</p>
              <ActionForm action={addJobCard} className="mt-4 grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="id" value={j.id} />
                <label className="block"><span className={label}>Date *</span><input type="date" name="workDate" required min={j.startDate.slice(0, 10)} max={j.endDate.slice(0, 10)} className={inputClass} /></label>
                <label className="block"><span className={label}>Hours worked</span><input name="hoursWorked" type="number" step="0.25" min="0" max="24" className={inputClass} /></label>
                <label className="block"><span className={label}>Loads</span><input name="loads" type="number" min="0" className={inputClass} /></label>
                <label className="block"><span className={label}>Hour meter start</span><input name="startHourMeter" type="number" step="0.1" min="0" className={inputClass} /></label>
                <label className="block"><span className={label}>Hour meter end</span><input name="endHourMeter" type="number" step="0.1" min="0" className={inputClass} /></label>
                <label className="block sm:col-span-3"><span className={label}>Notes</span><textarea name="notes" rows={2} maxLength={2000} className={inputClass} /></label>
                <div className="sm:col-span-3"><SubmitButton>Save job card</SubmitButton></div>
              </ActionForm>
            </section>
          )}

          <JobCards cards={j.jobCards} />

          {(j.status === "IN_PROGRESS" || (j.status === "COMPLETED" && j.payout?.status === "HELD")) && (
            <details className={panel}>
              <summary className="cursor-pointer font-display text-base font-semibold text-basalt">Problem on this job? Raise a dispute</summary>
              <ActionForm action={partnerDispute} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={j.id} />
                <textarea name="reason" required minLength={5} maxLength={2000} rows={3} placeholder="What's the problem?" className={inputClass} />
                <SubmitButton variant="subtle">Raise dispute</SubmitButton>
              </ActionForm>
            </details>
          )}
          <Disputes disputes={j.disputes} />
        </div>
        <Chat messages={j.messages} me="PARTNER" open={j.chatOpen} bookingId={j.id} action={sendPartnerMessage} />
      </div>
    </div>
  );
}
