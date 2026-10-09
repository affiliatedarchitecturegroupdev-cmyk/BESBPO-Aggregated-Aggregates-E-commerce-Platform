import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { ScheduleLines, ScheduleStatus } from "@/components/steel/ScheduleParts";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/account-types";
import { STATUS_LABEL, type ScheduleDetail } from "@/lib/bar-schedule";
import { formatZAR } from "@/lib/pricing";
import { getSession, sessionToken } from "@/lib/session";
import { eraseSchedule, quoteSchedule, updateSchedule } from "../actions";

export const metadata = { title: "Cut & bend schedule" };

const label = "font-mono text-[10px] uppercase text-slate";

export default async function AdminSchedulePage({ params }: { params: { id: string } }) {
  const [result, user] = await Promise.all([api<ScheduleDetail>(`/cut-and-bend/admin/${encodeURIComponent(params.id)}`, { token: sessionToken() }), getSession()]);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="font-body text-sm text-slate">{result.message}</p>;
  }
  const s = result.data;
  const inAWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date(Date.now() + 2 * 3_600_000).toISOString().slice(0, 10);
  const canQuote = s.status !== "ACCEPTED" && s.status !== "CLOSED";
  return (
    <div>
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/admin/cut-and-bend" className="hover:text-seam-blue">Cut &amp; bend</Link> / {s.reference}
      </nav>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-basalt">
          {s.reference} — {s.companyName ?? s.contactName}
        </h1>
        <ScheduleStatus status={s.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="min-w-0 rounded-sm border border-basalt/10 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-basalt">Schedule</h2>
            <div className="flex flex-wrap gap-3 font-body text-sm">
              {s.lines.length > 0 && <a href={`/api/admin/cut-and-bend/${s.id}/csv`} className="text-seam-blue hover:underline">Download rows (CSV)</a>}
              {s.fileName && <a href={`/api/admin/cut-and-bend/${s.id}/file`} className="text-seam-blue hover:underline">Download {s.fileName}</a>}
            </div>
          </div>
          <div className="mt-3">
            <ScheduleLines schedule={s} />
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-sm border border-basalt/10 bg-white p-5 font-body text-sm">
            <h2 className="font-display text-base font-semibold text-basalt">Customer</h2>
            <dl className="mt-2 space-y-1">
              {(
                [
                  ["Contact", s.contactName],
                  ["Email", s.contactEmail],
                  ["Phone", s.contactPhone],
                  ["Company", s.companyName],
                  ["Project", s.projectName],
                  ["Province", s.province],
                  ["Site", s.siteAddress],
                  ["Required by", s.requiredBy ? formatDate(s.requiredBy) : null],
                  ["Received", formatDate(s.createdAt)],
                ] as [string, string | null][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-slate">{k}</dt>
                    <dd className="text-right text-basalt">{v}</dd>
                  </div>
                ))}
            </dl>
            {s.message && <p className="mt-3 whitespace-pre-line rounded-sm bg-limestone/60 p-3 text-basalt">{s.message}</p>}
          </section>

          <section className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
            <h2 className="font-display text-base font-semibold text-basalt">Quote</h2>
            {s.quotedAmount !== null && (
              <p className="mt-1 font-body text-sm text-basalt">
                Sent {s.quotedAt ? formatDate(s.quotedAt) : ""}: <strong>{formatZAR(s.quotedAmount)}</strong>
                {s.quoteValidUntil ? `, valid until ${formatDate(s.quoteValidUntil)}` : ""}
                {s.respondedAt ? ` · customer responded ${formatDate(s.respondedAt)}` : ""}
              </p>
            )}
            {canQuote ? (
              <ActionForm key={s.quotedAt ?? "new"} action={quoteSchedule} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={s.id} />
                <label className="block">
                  <span className={label}>Quoted total (R) *</span>
                  <input name="amount" required inputMode="decimal" defaultValue={s.quotedAmount ?? ""} className={inputClass} />
                </label>
                <label className="block">
                  <span className={label}>Valid until *</span>
                  <input name="validUntil" type="date" required min={today} defaultValue={s.quoteValidUntil ?? inAWeek} className={inputClass} />
                </label>
                <label className="block">
                  <span className={label}>What&apos;s included (shown to the customer) *</span>
                  <textarea name="notes" required minLength={10} rows={4} defaultValue={s.quoteNotes ?? "Steel, cutting, bending and tagging by bar mark; delivery to site; mill certificates."} className={inputClass} />
                </label>
                <SubmitButton>{s.quotedAmount !== null ? "Send revised quote" : "Send quote"}</SubmitButton>
                <p className="font-body text-[11px] text-slate">Only send a price the merchant has confirmed in writing.</p>
              </ActionForm>
            ) : (
              <p className="mt-2 font-body text-sm text-slate">This schedule is {STATUS_LABEL[s.status].toLowerCase()} — no further quotes.</p>
            )}
          </section>

          <section className="rounded-sm border border-basalt/10 bg-white p-5">
            <h2 className="font-display text-base font-semibold text-basalt">Status &amp; notes</h2>
            <ActionForm key={`${s.status}-${s.staffNotes ?? ""}`} action={updateSchedule} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={s.id} />
              <label className="block">
                <span className={label}>Status</span>
                <select name="status" defaultValue={s.status} className={inputClass}>
                  {Object.entries(STATUS_LABEL).map(([key, l]) => (
                    <option key={key} value={key}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={label}>Staff notes (never shown to the customer)</span>
                <textarea name="staffNotes" rows={3} defaultValue={s.staffNotes ?? ""} className={inputClass} />
              </label>
              <SubmitButton variant="subtle">Save</SubmitButton>
              <p className="font-body text-[11px] text-slate">Guests accept by replying to the quote email — mark those Accepted here.</p>
            </ActionForm>
          </section>

          {user?.role === "ADMIN" && (
            <section className="rounded-sm border border-red-700/20 bg-white p-5">
              <h2 className="font-display text-base font-semibold text-basalt">Erase (POPIA request)</h2>
              <ActionForm action={eraseSchedule} className="mt-3 space-y-3">
                <input type="hidden" name="id" value={s.id} />
                <label className="block">
                  <span className={label}>Type ERASE to delete the schedule, its file and its emails</span>
                  <input name="confirm" className={inputClass} autoComplete="off" />
                </label>
                <SubmitButton variant="subtle">Erase permanently</SubmitButton>
              </ActionForm>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
