"use client";

import Link from "next/link";
import { useState } from "react";
import { BUILD_COST_PER_M2, feeFor, findDesignService, nhbrcEnrolmentFee } from "@/data/design-services";
import { formatZAR } from "@/lib/pricing";

type Project = "newHouse" | "addition";
type Spec = keyof typeof BUILD_COST_PER_M2;

const field = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";
const label = "font-mono text-[10px] uppercase text-slate";
const rand = (n: number) => formatZAR(Math.round(n)).replace(/\.00$/, "");
const range = (r: { low: number; high: number }) => (Math.round(r.low) === Math.round(r.high) ? rand(r.low) : `${rand(r.low)} – ${rand(r.high)}`);

/**
 * Budget for BAE's fees before sending a brief: floor area × a building
 * cost per m² gives the cost of the work, which the percentage fees run on.
 * Indicative only — BAE's proposal sets the fee (DESIGN_SERVICES.md).
 */
export function DesignFeeEstimator() {
  const [project, setProject] = useState<Project>("newHouse");
  const [area, setArea] = useState("180");
  const [spec, setSpec] = useState<Spec>("standard");
  const [rate, setRate] = useState<string>(String(BUILD_COST_PER_M2.standard.rate));
  const [engineer, setEngineer] = useState(true);
  const [boq, setBoq] = useState(true);

  const m2 = Math.max(0, Number(area.replace(",", ".")) || 0);
  const perM2 = Math.max(0, Number(rate.replace(/[ ,]/g, "")) || 0);
  const cost = m2 * perM2;
  const ready = m2 > 0 && perM2 > 0;

  const plans = findDesignService(project === "newHouse" ? "house-plans" : "additions-alterations")!;
  const lines: { name: string; slug: string; fee: { low: number; high: number } }[] = [{ name: plans.name, slug: plans.slug, fee: feeFor(plans.fee, m2, cost)! }];
  if (engineer) {
    const s = findDesignService("structural-design")!;
    lines.push({ name: s.name, slug: s.slug, fee: feeFor(s.fee, m2, cost)! });
  }
  if (project === "newHouse") {
    const s = findDesignService("foundation-inspections")!;
    lines.push({ name: s.name, slug: s.slug, fee: feeFor(s.fee, m2, cost)! });
  }
  if (boq) {
    const s = findDesignService("bill-of-quantities")!;
    lines.push({ name: s.name, slug: s.slug, fee: feeFor(s.fee, m2, cost)! });
  }
  const total = lines.reduce((t, l) => ({ low: t.low + l.fee.low, high: t.high + l.fee.high }), { low: 0, high: 0 });
  const full = feeFor(findDesignService("full-architectural-service")!.fee, m2, cost)!;
  const nhbrc = nhbrcEnrolmentFee(cost);

  const brief = `/design/${plans.slug}?${new URLSearchParams({ area: String(m2), cost: String(Math.round(cost)) }).toString()}#brief`;

  return (
    <div className="rounded-sm border border-basalt/10 bg-white p-5 md:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="sm:col-span-2">
          <legend className={label}>Project</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {(
              [
                ["newHouse", "New house"],
                ["addition", "Addition or alteration"],
              ] as [Project, string][]
            ).map(([value, text]) => (
              <button
                key={value}
                type="button"
                aria-pressed={project === value}
                onClick={() => setProject(value)}
                className={`rounded-sm border px-3 py-1.5 font-body text-sm ${project === value ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-basalt hover:border-seam-blue"}`}
              >
                {text}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className={label}>{project === "newHouse" ? "Floor area (m²)" : "New floor area (m²)"}</span>
          <input inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} className={field} />
        </label>
        <label className="block">
          <span className={label}>Finish level</span>
          <select
            value={spec}
            onChange={(e) => {
              const next = e.target.value as Spec;
              setSpec(next);
              setRate(String(BUILD_COST_PER_M2[next].rate));
            }}
            className={field}
          >
            {Object.entries(BUILD_COST_PER_M2).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label} — about {rand(v.rate)}/m²
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className={label}>Building cost per m² (change it if you have a builder&apos;s figure)</span>
          <input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value)} className={field} />
        </label>
        <label className="flex items-center gap-2 font-body text-sm text-basalt">
          <input type="checkbox" checked={engineer} onChange={(e) => setEngineer(e.target.checked)} className="h-4 w-4" />
          Engineer&apos;s structural design
        </label>
        <label className="flex items-center gap-2 font-body text-sm text-basalt">
          <input type="checkbox" checked={boq} onChange={(e) => setBoq(e.target.checked)} className="h-4 w-4" />
          Bill of quantities
        </label>
      </div>

      {ready && (
        <div className="mt-5 border-t border-basalt/10 pt-4" aria-live="polite">
          <p className="font-body text-sm text-slate">
            Building cost, roughly <strong className="text-basalt">{rand(cost)}</strong> ({m2.toLocaleString("en-US")} m² × {rand(perM2)}/m²)
          </p>
          <table className="mt-3 w-full font-body text-sm">
            <tbody className="divide-y divide-basalt/10">
              {lines.map((l) => (
                <tr key={l.slug}>
                  <td className="py-2 pr-3">
                    <Link href={`/design/${l.slug}`} className="text-basalt hover:text-seam-blue hover:underline">
                      {l.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right text-basalt">{range(l.fee)}</td>
                </tr>
              ))}
              <tr>
                <th className="py-2 pr-3 text-left font-semibold text-basalt">Indicative design fees</th>
                <td className="whitespace-nowrap py-2 text-right font-display text-lg font-bold text-seam-blue">{range(total)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 font-body text-xs text-slate">
            Or a <Link href="/design/full-architectural-service" className="text-seam-blue hover:underline">full architectural service</Link> through to completion: about {range(full)}.
          </p>
          {project === "newHouse" && (
            <p className="mt-2 font-body text-xs text-slate">
              NHBRC home enrolment (statutory, paid by the home builder before building starts): about <strong className="text-basalt">{rand(nhbrc)}</strong> plus VAT on a
              contract of {rand(cost)}. The NHBRC confirms the amount.
            </p>
          )}
          <p className="mt-2 font-body text-xs text-slate">
            Municipal plan fees, surveys, the energy (XA) design and specialist reports are extra. These are budget figures from the building cost — BAE&apos;s written proposal
            sets the fee for your project.
          </p>
          <Link href={brief} className="mt-4 inline-block rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
            Send BAE this brief
          </Link>
        </div>
      )}
      {!ready && <p className="mt-4 font-body text-xs text-slate">Enter the floor area and a building cost per m² to see the fees.</p>}
    </div>
  );
}
