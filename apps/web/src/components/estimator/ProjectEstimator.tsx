"use client";

import Link from "next/link";
import { useState } from "react";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { JOB_PACKS, type EstimatorTemplate } from "@/data/job-packs";

/** Compaction allowance on fill and base layers. ASSUMPTION — confirm with the engineer or contractor for the job. */
const COMPACTION_ALLOWANCE = 0.15;
/** Loose bulk density for the tonnage guide (t/m³). ASSUMPTION — varies by material; each product page is authoritative. */
const DENSITY_T_PER_M3 = 1.6;
const TRUCK_M3 = 10;

const TEMPLATES: { key: EstimatorTemplate; label: string; layers: string; compact: boolean; depth: string }[] = [
  { key: "driveway", label: "Driveway / hardstand", layers: "Base and wearing layers", compact: true, depth: "150" },
  { key: "slab", label: "Slab / foundation", layers: "Hardcore, blinding and concrete", compact: false, depth: "100" },
  { key: "drainage", label: "Drainage / soakaway", layers: "Filter stone and bedding", compact: false, depth: "600" },
  { key: "platform", label: "Building platform", layers: "Imported fill, compacted", compact: true, depth: "300" },
  { key: "demolition-fill", label: "Demolition to fill", layers: "Rubble out, recycled fill in", compact: true, depth: "300" },
];

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** A volume / tonnage / truck-load guide that suggests the matching job pack and sends the sizing with the request. */
export function ProjectEstimator({ initial }: { initial?: string }) {
  const start = TEMPLATES.find((t) => t.key === initial) ?? TEMPLATES[0];
  const [template, setTemplate] = useState<EstimatorTemplate>(start.key);
  const [length, setLength] = useState("10");
  const [width, setWidth] = useState("4");
  const [depth, setDepth] = useState(start.depth);

  const t = TEMPLATES.find((x) => x.key === template)!;
  const base = num(length) * num(width) * (num(depth) / 1000);
  const volume = t.compact ? base * (1 + COMPACTION_ALLOWANCE) : base;
  const tons = volume * DENSITY_T_PER_M3;
  const loads = Math.ceil(volume / TRUCK_M3);
  const pack = JOB_PACKS.find((p) => p.estimatorTemplate === template);
  const field = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";
  const label = "block font-mono text-[10px] uppercase text-slate";

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4 rounded-sm border border-basalt/10 bg-white p-5">
          <label className={label}>
            Job type
            <select
              className={field}
              value={template}
              onChange={(e) => {
                const next = TEMPLATES.find((x) => x.key === e.target.value)!;
                setTemplate(next.key);
                setDepth(next.depth);
              }}
            >
              {TEMPLATES.map((x) => (
                <option key={x.key} value={x.key}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className={label}>
              Length (m)
              <input className={field} inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} />
            </label>
            <label className={label}>
              Width (m)
              <input className={field} inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} />
            </label>
            <label className={label}>
              Depth (mm)
              <input className={field} inputMode="decimal" value={depth} onChange={(e) => setDepth(e.target.value)} />
            </label>
          </div>
          <p className="font-body text-xs text-slate">{t.layers}.</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-sm border border-basalt/10 bg-white p-5" aria-live="polite">
            <h2 className="font-display text-lg font-semibold text-basalt">Your estimate</h2>
            <dl className="mt-3 grid grid-cols-3 gap-3 font-body text-sm text-basalt">
              <div>
                <dt className="text-xs text-slate">Volume</dt>
                <dd className="font-display text-xl font-bold">{volume.toFixed(1)} m³</dd>
              </div>
              <div>
                <dt className="text-xs text-slate">Approx. weight</dt>
                <dd className="font-display text-xl font-bold">{tons.toFixed(1)} t</dd>
              </div>
              <div>
                <dt className="text-xs text-slate">Truck loads</dt>
                <dd className="font-display text-xl font-bold">{loads}</dd>
              </div>
            </dl>
            <p className="mt-3 font-body text-xs text-slate">
              Assumptions: {t.compact ? `${COMPACTION_ALLOWANCE * 100}% compaction allowance, ` : ""}
              {DENSITY_T_PER_M3} t/m³ loose density, {TRUCK_M3} m³ tipper loads. A guide only — confirm quantities with your engineer.
            </p>
          </div>
          {pack && (
            <div className="rounded-sm border border-basalt/10 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-basalt">Suggested: {pack.name}</h3>
              <ul className="mt-2 list-disc pl-5 font-body text-sm text-basalt">
                {pack.lines.map((l) => (
                  <li key={`${pack.slug}-${l.sku}`}>{l.label}</li>
                ))}
              </ul>
              <Link href={`/job-packs#${pack.slug}`} className="mt-3 inline-block font-body text-sm font-semibold text-seam-blue hover:underline">
                See the pack →
              </Link>
            </div>
          )}
        </div>
      </div>

      <section className="rounded-sm border border-basalt/10 bg-white p-5 md:p-8">
        <h2 className="font-display text-xl font-bold text-basalt">Send this estimate for a quote</h2>
        <p className="mt-1 font-body text-sm text-slate">We&apos;ll check the quantities, price the materials and match the plant — one written quote.</p>
        <div className="mt-5">
          <EnquiryForm
            kind="ESTIMATE"
            subject={`Estimate: ${t.label}${pack ? ` (${pack.name} pack)` : ""}`}
            hidden={{
              "Job type": t.label,
              Dimensions: `${num(length)}m x ${num(width)}m x ${num(depth)}mm`,
              "Volume m3": volume.toFixed(1),
              "Approx tonnes": tons.toFixed(1),
              "Truck loads": String(loads),
            }}
            submitLabel="Request a quote for this job"
          />
        </div>
      </section>
    </div>
  );
}
