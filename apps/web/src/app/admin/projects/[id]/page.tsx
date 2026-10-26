import Link from "next/link";
import { notFound } from "next/navigation";
import { ProposalEditor } from "@/components/admin/ProposalEditor";
import { api } from "@/lib/api";
import { formatZAR } from "@/lib/pricing";
import { STATUS_LABEL, type ProjectStatus, type StaffProject } from "@/lib/projects";
import { sessionToken } from "@/lib/session";
import { recordMilestone, sendProposal, updateProject } from "../actions";

export const metadata = { title: "Project" };

const SETTABLE: ProjectStatus[] = ["BRIEF", "DESIGN", "QUOTING", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const date = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });
const small = "rounded-sm border border-basalt/20 px-2 py-1 font-body text-xs";

/** One design-and-build project: the brief and take-off, the proposal, and the stage payments. */
export default async function AdminProjectPage({ params, searchParams }: { params: { id: string }; searchParams: { done?: string; error?: string } }) {
  const result = await api<StaffProject>(`/projects/staff/${encodeURIComponent(params.id)}`, { token: sessionToken() });
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <p className="font-body text-sm text-slate">{result.message}</p>;
  }
  const p = result.data;
  const editable = ["BRIEF", "DESIGN", "QUOTING", "PROPOSED"].includes(p.status);
  return (
    <div className="space-y-6">
      <Link href="/admin/projects" className="font-body text-sm text-seam-blue hover:underline">
        ← Projects
      </Link>
      <div>
        <h2 className="font-display text-xl font-bold text-basalt">
          {p.reference} — {p.summary}
        </h2>
        <p className="mt-1 font-body text-xs text-slate">
          {p.packageLabel} · {p.contactName} · {p.contactEmail}
          {p.contactPhone ? ` · ${p.contactPhone}` : ""} · {p.siteAddress ? `${p.siteAddress}, ` : ""}
          {p.province} · received {date(p.createdAt)} · <strong className="text-basalt">{STATUS_LABEL[p.status]}</strong>
          {p.acceptedAt ? ` · accepted by ${p.acceptedName} on ${date(p.acceptedAt)}` : ""}
        </p>
      </div>
      {searchParams.error && (
        <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">
          {searchParams.error}
        </p>
      )}
      {searchParams.done && <p className="rounded-sm border border-seam-blue/30 bg-white p-3 font-body text-sm text-basalt">{searchParams.done}</p>}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
          <h3 className="font-display text-base font-bold text-basalt">Brief and take-off</h3>
          <p className="mt-1 text-xs text-slate">
            {(p.takeoff.figures ?? []).map((f) => `${f.label} ${f.value.toLocaleString("en-US")} ${f.unit}`).join(" · ")}
            {typeof p.brief.pitchDeg === "number" ? ` · pitch ${p.brief.pitchDeg}°` : ""}
          </p>
          <ul className="mt-2 space-y-0.5 text-xs">
            {p.takeoff.lines.map((l) => (
              <li key={l.key}>
                {l.label}: <strong>{l.quantity.toLocaleString("en-US")} {l.unit}</strong>
              </li>
            ))}
          </ul>
          {p.takeoff.warnings.map((w) => (
            <p key={w} className="mt-2 text-xs text-amber-800">
              {w}
            </p>
          ))}
          {p.clientNotes && <p className="mt-3 rounded-sm bg-limestone/60 p-2 text-xs">Client: {p.clientNotes}</p>}
        </div>
        <form action={updateProject} className="space-y-3 rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
          <input type="hidden" name="id" value={p.id} />
          <h3 className="font-display text-base font-bold text-basalt">Stage and notes</h3>
          <label className="block text-xs text-slate">
            Stage
            <select name="status" defaultValue={SETTABLE.includes(p.status) ? p.status : ""} className={`${small} mt-1 block`}>
              {!SETTABLE.includes(p.status) && <option value="">{STATUS_LABEL[p.status]} (set by the proposal)</option>}
              {SETTABLE.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-slate">
            Staff notes (never shown to the client)
            <textarea name="staffNotes" rows={4} maxLength={5000} defaultValue={p.staffNotes ?? ""} className={`${small} mt-1 w-full text-sm`} />
          </label>
          <button className="rounded-sm border border-seam-blue px-3 py-1.5 text-xs font-semibold text-seam-blue hover:bg-seam-blue hover:text-limestone">Save</button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold text-basalt">Proposal</h3>
          {editable && p.lines.length > 0 && (
            <form action={sendProposal}>
              <input type="hidden" name="id" value={p.id} />
              <button className="rounded-sm bg-ochre-gold px-4 py-2 font-body text-sm font-semibold text-basalt hover:bg-basalt hover:text-limestone">
                {p.proposalSentAt ? "Send it again (new link)" : "Email the proposal to the client"}
              </button>
            </form>
          )}
        </div>
        {p.proposalSentAt && (
          <p className="font-body text-xs text-slate">
            Sent {date(p.proposalSentAt)}
            {p.proposalValidUntil ? `, valid until ${date(p.proposalValidUntil)}` : ""}.
          </p>
        )}
        <ProposalEditor project={p} editable={editable} />
      </section>

      {p.milestones.length > 0 && (
        <section>
          <h3 className="font-display text-lg font-bold text-basalt">Stage payments</h3>
          <ul className="mt-2 divide-y divide-basalt/5 rounded-sm border border-basalt/10 bg-white">
            {p.milestones.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3 font-body text-sm">
                <span>
                  {m.sequence}. {m.label} · <strong>{formatZAR(Number(m.amount))}</strong> ({Number(m.percent)}%)
                </span>
                {m.status === "PAID" ? (
                  <span className="text-xs text-seam-blue">
                    Paid {m.paidAt ? date(m.paidAt) : ""}
                    {m.paymentReference ? ` · ${m.paymentReference}` : ""}
                  </span>
                ) : ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(p.status) ? (
                  <form action={recordMilestone} className="flex items-center gap-2">
                    <input type="hidden" name="projectId" value={p.id} />
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <input name="reference" maxLength={120} placeholder="EFT reference" aria-label="Payment reference" className={`${small} w-36`} />
                    <button className="rounded-sm bg-seam-blue px-3 py-1 text-xs font-semibold text-limestone hover:bg-basalt">Record payment</button>
                  </form>
                ) : (
                  <span className="text-xs text-slate">Due once accepted</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
