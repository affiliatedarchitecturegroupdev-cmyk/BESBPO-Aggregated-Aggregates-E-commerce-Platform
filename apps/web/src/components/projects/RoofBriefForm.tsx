"use client";

import { useState } from "react";
import { briefInput, briefLabel, ProjectBriefForm } from "@/components/projects/ProjectBriefForm";
import { COVERINGS, SHAPES, type RoofBrief } from "@/lib/projects";

/** The complete-roof brief (docs/projects.md): footprint, shape, pitch and covering. */
export function RoofBriefForm({ signedIn }: { signedIn: { name: string | null; email: string } | null }) {
  const [brief, setBrief] = useState<RoofBrief>({ shape: "GABLE", lengthM: 12, widthM: 8, pitchDeg: 26, covering: "CONCRETE_TILE", overhangM: 0.6, insulation: true });
  const set = <K extends keyof RoofBrief>(key: K, value: RoofBrief[K]) => setBrief((b) => ({ ...b, [key]: value }));
  return (
    <ProjectBriefForm pkg="ROOF" brief={brief} signedIn={signedIn} what="roof" heading="Your roof">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={briefLabel}>
          Shape
          <select name="shape" value={brief.shape} onChange={(e) => set("shape", e.target.value as RoofBrief["shape"])} className={briefInput}>
            {SHAPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className={briefLabel}>
          Covering
          <select
            name="covering"
            value={brief.covering}
            onChange={(e) => {
              const covering = e.target.value as RoofBrief["covering"];
              setBrief((b) => ({ ...b, covering, pitchDeg: COVERINGS.find((c) => c.value === covering)!.pitch }));
            }}
            className={briefInput}
          >
            {COVERINGS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className={briefLabel}>
          Length, wall to wall (m)
          <input name="lengthM" type="number" min={2} max={120} step={0.1} value={brief.lengthM} onChange={(e) => set("lengthM", Number(e.target.value))} className={briefInput} />
        </label>
        <label className={briefLabel}>
          Width (span), wall to wall (m)
          <input name="widthM" type="number" min={2} max={60} step={0.1} value={brief.widthM} onChange={(e) => set("widthM", Number(e.target.value))} className={briefInput} />
        </label>
        <label className={briefLabel}>
          Pitch (°)
          <input name="pitchDeg" type="number" min={1} max={50} step={0.5} value={brief.pitchDeg} onChange={(e) => set("pitchDeg", Number(e.target.value))} className={briefInput} />
        </label>
        <label className={briefLabel}>
          Overhang (m)
          <input name="overhangM" type="number" min={0} max={1.5} step={0.05} value={brief.overhangM} onChange={(e) => set("overhangM", Number(e.target.value))} className={briefInput} />
        </label>
      </div>
      <label className="flex items-center gap-2 font-body text-sm text-basalt">
        <input type="checkbox" checked={brief.insulation} onChange={(e) => set("insulation", e.target.checked)} className="h-4 w-4 accent-seam-blue" />
        Include ceiling insulation
      </label>
    </ProjectBriefForm>
  );
}
