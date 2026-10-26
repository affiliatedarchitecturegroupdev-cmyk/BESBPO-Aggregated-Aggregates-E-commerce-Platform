import { formatZAR } from "@/lib/pricing";
import { LINE_KIND_LABEL, type ClientProject } from "@/lib/projects";

const qty = (v: string) => Number(v).toLocaleString("en-US", { maximumFractionDigits: 3 });
const date = (iso: string) => new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg" });

/** A design-and-build proposal as the client sees it: the package's lines, total and stage payments. */
export function ProposalView({ project }: { project: ClientProject }) {
  const p = project.proposal!;
  return (
    <div className="space-y-5">
      {p.message && <p className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm text-basalt">{p.message}</p>}
      <div className="overflow-x-auto rounded-sm border border-basalt/10 bg-white">
        <table className="w-full min-w-[520px] font-body text-sm">
          <thead>
            <tr className="border-b border-basalt/10 text-left text-xs text-slate">
              <th className="p-3">What</th>
              <th className="p-3 text-right">Quantity</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {p.lines.map((l, i) => (
              <tr key={i} className="border-t border-basalt/5 align-top">
                <td className="p-3 text-basalt">
                  {l.description}
                  <span className="block font-mono text-[10px] uppercase text-slate">{LINE_KIND_LABEL[l.kind]}</span>
                </td>
                <td className="p-3 text-right">
                  {qty(l.quantity)} {l.unit ?? ""}
                </td>
                <td className="p-3 text-right">{formatZAR(Number(l.unitPrice))}</td>
                <td className="p-3 text-right font-semibold">{formatZAR(l.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-basalt/20">
              <td colSpan={3} className="p-3 text-right font-display font-bold text-basalt">
                Total
              </td>
              <td className="p-3 text-right font-display text-lg font-bold text-basalt">{formatZAR(Number(p.total))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="rounded-sm border border-basalt/10 bg-white p-4">
        <h3 className="font-display text-base font-bold text-basalt">Stage payments</h3>
        <ol className="mt-2 divide-y divide-basalt/5 font-body text-sm">
          {p.milestones.map((m) => (
            <li key={m.sequence} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {m.sequence}. {m.label} <span className="text-slate">({Number(m.percent)}%)</span>
              </span>
              <span className="font-semibold">
                {formatZAR(Number(m.amount))}
                {m.status === "PAID" && <span className="ml-2 rounded-sm bg-seam-blue/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-seam-blue">Paid {m.paidAt ? date(m.paidAt) : ""}</span>}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 font-body text-xs text-slate">Pay each stage by EFT with {project.reference} as the reference. We confirm every payment by email.</p>
      </div>
    </div>
  );
}
