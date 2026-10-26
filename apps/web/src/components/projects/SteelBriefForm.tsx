"use client";

import { useState } from "react";
import { briefInput, briefLabel, ProjectBriefForm } from "@/components/projects/ProjectBriefForm";
import { STEEL_SHEETS, STEEL_USES, type SteelBrief } from "@/lib/projects";

/** The steel-structure brief (docs/projects.md): what it's for, its size and height, roof and cladding. */
export function SteelBriefForm({ signedIn }: { signedIn: { name: string | null; email: string } | null }) {
  const [brief, setBrief] = useState<SteelBrief>({ use: "WAREHOUSE", roof: "DUO", lengthM: 30, spanM: 15, eavesHeightM: 6, pitchDeg: 6, sheeting: "IBR", enclosed: true, rollerDoors: 1, insulation: false, floorSlab: false });
  const set = <K extends keyof SteelBrief>(key: K, value: SteelBrief[K]) => setBrief((b) => ({ ...b, [key]: value }));
  return (
    <ProjectBriefForm pkg="STEEL_STRUCTURE" brief={brief} signedIn={signedIn} what="structure" heading="Your structure">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={briefLabel}>
          What it&apos;s for
          <select
            name="use"
            value={brief.use}
            onChange={(e) => {
              const use = STEEL_USES.find((u) => u.value === e.target.value)!;
              setBrief((b) => ({ ...b, use: use.value, enclosed: use.enclosed, rollerDoors: use.enclosed ? Math.max(b.rollerDoors, 1) : 0, eavesHeightM: use.enclosed ? Math.max(b.eavesHeightM, 4) : Math.min(b.eavesHeightM, 3) }));
            }}
            className={briefInput}
          >
            {STEEL_USES.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <label className={briefLabel}>
          Roof
          <select name="roof" value={brief.roof} onChange={(e) => set("roof", e.target.value as SteelBrief["roof"])} className={briefInput}>
            <option value="DUO">Duo-pitch (two slopes)</option>
            <option value="MONO">Mono-pitch (one slope)</option>
          </select>
        </label>
        <label className={briefLabel}>
          Length (m)
          <input name="lengthM" type="number" min={3} max={200} step={0.5} value={brief.lengthM} onChange={(e) => set("lengthM", Number(e.target.value))} className={briefInput} />
        </label>
        <label className={briefLabel}>
          Span — width (m)
          <input name="spanM" type="number" min={3} max={60} step={0.5} value={brief.spanM} onChange={(e) => set("spanM", Number(e.target.value))} className={briefInput} />
        </label>
        <label className={briefLabel}>
          Eaves height (m)
          <input name="eavesHeightM" type="number" min={2} max={15} step={0.1} value={brief.eavesHeightM} onChange={(e) => set("eavesHeightM", Number(e.target.value))} className={briefInput} />
        </label>
        <label className={briefLabel}>
          Roof pitch (°)
          <input name="pitchDeg" type="number" min={1} max={30} step={0.5} value={brief.pitchDeg} onChange={(e) => set("pitchDeg", Number(e.target.value))} className={briefInput} />
        </label>
        <label className={briefLabel}>
          Sheeting
          <select name="sheeting" value={brief.sheeting} onChange={(e) => set("sheeting", e.target.value as SteelBrief["sheeting"])} className={briefInput}>
            {STEEL_SHEETS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className={briefLabel}>
          Roller doors (about 4 × 4 m)
          <input name="rollerDoors" type="number" min={0} max={20} step={1} disabled={!brief.enclosed} value={brief.rollerDoors} onChange={(e) => set("rollerDoors", Number(e.target.value))} className={briefInput} />
        </label>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 font-body text-sm text-basalt">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="enclosed" checked={brief.enclosed} onChange={(e) => setBrief((b) => ({ ...b, enclosed: e.target.checked, rollerDoors: e.target.checked ? b.rollerDoors : 0 }))} className="h-4 w-4 accent-seam-blue" />
          Clad walls all round
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={brief.insulation} onChange={(e) => set("insulation", e.target.checked)} className="h-4 w-4 accent-seam-blue" />
          Roof insulation
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={brief.floorSlab} onChange={(e) => set("floorSlab", e.target.checked)} className="h-4 w-4 accent-seam-blue" />
          Concrete floor slab
        </label>
      </div>
    </ProjectBriefForm>
  );
}
