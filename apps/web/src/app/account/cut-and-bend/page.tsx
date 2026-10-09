import type { Metadata } from "next";
import Link from "next/link";
import { AccountNav } from "@/components/account/AccountNav";
import { ScheduleStatus } from "@/components/steel/ScheduleParts";
import { api } from "@/lib/api";
import { kg, type ScheduleSummary } from "@/lib/bar-schedule";
import { formatZAR } from "@/lib/pricing";
import { requireSession, sessionToken } from "@/lib/session";

export const metadata: Metadata = { title: "Cut & Bend Schedules", robots: { index: false } };

export default async function CutAndBendSchedulesPage() {
  await requireSession("/account/cut-and-bend");
  const result = await api<ScheduleSummary[]>("/cut-and-bend/mine", { token: sessionToken() });
  const schedules = result.ok ? result.data : [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-basalt">Cut &amp; bend schedules</h1>
      <AccountNav current="/account/cut-and-bend" />
      {!result.ok && <p className="mt-6 font-body text-sm text-slate">{result.message}</p>}
      {result.ok && schedules.length === 0 && (
        <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6 font-body text-sm text-slate">
          <p>No schedules yet. Send a bar bending schedule and its quote appears here for you to accept.</p>
          <p className="mt-3">
            <Link href="/reinforcing-steel/cut-and-bend" className="font-semibold text-seam-blue hover:underline">Send a bar bending schedule</Link>
          </p>
        </div>
      )}
      <ul className="mt-6 space-y-3">
        {schedules.map((s) => (
          <li key={s.id}>
            <Link href={`/account/cut-and-bend/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-basalt/10 bg-white p-4 hover:border-seam-blue">
              <div className="min-w-0">
                <p className="font-mono text-[11px] text-slate">
                  {s.reference} · {s.lineCount ? `${s.lineCount} rows · ${kg(s.totalMassKg)}` : "schedule file"}
                </p>
                <p className="mt-1 font-display text-base font-semibold text-basalt">{s.projectName ?? "Bar bending schedule"}</p>
              </div>
              <div className="flex items-center gap-3">
                {s.quotedAmount !== null && <span className="font-body text-sm font-semibold text-basalt">{formatZAR(s.quotedAmount)}</span>}
                <ScheduleStatus status={s.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
