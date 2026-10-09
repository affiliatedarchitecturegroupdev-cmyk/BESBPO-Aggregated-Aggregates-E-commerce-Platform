import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/account/Forms";
import { ScheduleLines, ScheduleStatus } from "@/components/steel/ScheduleParts";
import { api } from "@/lib/api";
import type { ScheduleDetail } from "@/lib/bar-schedule";
import { formatDate } from "@/lib/account-types";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";
import { acceptScheduleQuote, declineScheduleQuote } from "../actions";

export const metadata: Metadata = { title: "Cut & Bend Schedule", robots: { index: false } };

const today = () => new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);

export default async function CutAndBendSchedulePage({ params }: { params: { id: string } }) {
  await requireSession(`/account/cut-and-bend/${params.id}`);
  const result = await api<ScheduleDetail>(`/cut-and-bend/mine/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="mx-auto max-w-6xl px-4 py-10 font-body text-sm text-slate">{result.message}</p>;
  }
  const s = result.data;
  const expired = s.quoteValidUntil !== null && s.quoteValidUntil < today();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/account/cut-and-bend" className="hover:text-seam-blue">Cut &amp; bend schedules</Link> / {s.reference}
      </nav>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-basalt">{s.projectName ?? "Bar bending schedule"}</h1>
        <ScheduleStatus status={s.status} />
      </div>
      <p className="mt-1 font-body text-sm text-slate">
        {s.reference} · sent {formatDate(s.createdAt)}
        {s.requiredBy ? ` · required by ${formatDate(s.requiredBy)}` : ""}
        {s.fileName ? ` · file: ${s.fileName}` : ""}
      </p>

      {s.status === "QUOTED" && s.quotedAmount !== null && (
        <section className="mt-6 rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
          <h2 className="font-display text-lg font-semibold text-basalt">Our quote: {formatZAR(s.quotedAmount)}</h2>
          {s.quoteValidUntil && <p className="mt-1 font-body text-sm text-slate">Valid until {formatDate(s.quoteValidUntil)}{expired ? " — this quote has expired; reply to our email to have it re-quoted." : ""}</p>}
          {s.quoteNotes && <p className="mt-3 whitespace-pre-line font-body text-sm text-basalt">{s.quoteNotes}</p>}
          {!expired && (
            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
              <ActionForm action={acceptScheduleQuote} className="space-y-3">
                <input type="hidden" name="id" value={s.id} />
                <label className="flex items-start gap-2 font-body text-sm text-basalt">
                  <input type="checkbox" name="checked" required className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>I&apos;ve checked the bar marks, sizes, shape codes and lengths against the drawings — bars are made to this schedule.</span>
                </label>
                <SubmitButton>Accept the quote</SubmitButton>
              </ActionForm>
              <ActionForm action={declineScheduleQuote} className="self-end">
                <input type="hidden" name="id" value={s.id} />
                <SubmitButton variant="subtle">Decline</SubmitButton>
              </ActionForm>
            </div>
          )}
        </section>
      )}
      {s.status === "ACCEPTED" && (
        <p className="mt-6 rounded-sm border border-[#006300]/30 bg-[#006300]/5 p-4 font-body text-sm text-basalt">
          You accepted our quote{s.quotedAmount !== null ? ` of ${formatZAR(s.quotedAmount)}` : ""}. We&apos;ll confirm payment and the delivery slot with you.
        </p>
      )}
      {(s.status === "NEW" || s.status === "IN_REVIEW") && (
        <p className="mt-6 rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-slate">
          We&apos;re pricing your schedule with the merchant — you&apos;ll get an email when the quote is ready.
        </p>
      )}

      <section className="mt-8 rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-display text-lg font-semibold text-basalt">Schedule</h2>
        <div className="mt-3">
          <ScheduleLines schedule={s} />
        </div>
      </section>
    </div>
  );
}
