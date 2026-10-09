import { kg, STATUS_LABEL, type ScheduleDetail } from "@/lib/bar-schedule";

const PILL: Record<string, string> = {
  NEW: "bg-limestone text-basalt",
  IN_REVIEW: "bg-ochre-gold/20 text-basalt",
  QUOTED: "bg-seam-blue text-limestone",
  ACCEPTED: "bg-[#006300] text-white",
  DECLINED: "bg-basalt/10 text-slate",
  CLOSED: "bg-basalt/10 text-slate",
};

export function ScheduleStatus({ status }: { status: string }) {
  return <span className={`rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wide ${PILL[status] ?? PILL.NEW}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** The schedule rows and the totals by size, as entered (and re-totalled by the API). */
export function ScheduleLines({ schedule }: { schedule: Pick<ScheduleDetail, "lines" | "bySize" | "totalMassKg" | "fileName"> }) {
  if (schedule.lines.length === 0) {
    return <p className="font-body text-sm text-slate">No rows were typed in — the schedule is in the attached file{schedule.fileName ? ` (${schedule.fileName})` : ""}.</p>;
  }
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse font-body text-sm">
          <caption className="sr-only">Schedule rows</caption>
          <thead>
            <tr className="border-b border-basalt/10 text-left text-xs text-slate">
              {["Bar mark", "Member", "Size", "Shape", "Members", "Bars each", "Total bars", "Cut length", "Mass"].map((h, i) => (
                <th key={h} scope="col" className={`px-2 py-2 font-medium ${i >= 4 ? "text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedule.lines.map((l) => (
              <tr key={l.id} className="border-b border-basalt/5">
                <td className="px-2 py-1.5 font-semibold text-basalt">{l.barMark}</td>
                <td className="px-2 py-1.5 text-slate">{l.member ?? "—"}</td>
                <td className="px-2 py-1.5">{l.barType}{l.diameterMm}</td>
                <td className="px-2 py-1.5 font-mono">{l.shapeCode}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{l.members}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{l.barsPerMember}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{l.bars}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{l.lengthMm.toLocaleString("en-US")} mm</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{kg(l.massKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">By size (SANS 920 nominal mass)</h3>
        <ul className="mt-2 flex flex-wrap gap-2 font-body text-sm">
          {schedule.bySize.map((t) => (
            <li key={`${t.barType}${t.diameterMm}`} className="rounded-sm bg-limestone px-3 py-1.5 text-basalt">
              <strong>{t.barType}{t.diameterMm}</strong> · {t.bars} bars · {t.metres.toLocaleString("en-US")} m · {kg(t.massKg)}
            </li>
          ))}
          <li className="rounded-sm bg-basalt px-3 py-1.5 text-limestone">Total {kg(schedule.totalMassKg)}</li>
        </ul>
      </div>
    </div>
  );
}
