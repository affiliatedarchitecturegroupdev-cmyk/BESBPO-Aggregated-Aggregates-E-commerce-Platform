"use client";

import Link from "next/link";
import { useState } from "react";
import { barTakeOff, BAR_MASS_KG_PER_M, Y_BARS } from "@/data/steel";

/**
 * Rebar take-off: bars x length (or a total run) to kg, tonnes and 6 m
 * stock lengths, from the SANS 920 nominal mass per metre. No allowance for
 * laps or offcuts — the engineer's bar schedule governs.
 */
export function BarMassCalculator({ diameterMm, compact = false }: { diameterMm?: number; compact?: boolean }) {
  const diameters = Object.keys(BAR_MASS_KG_PER_M).map(Number);
  const [diameter, setDiameter] = useState(diameterMm ?? 12);
  const [bars, setBars] = useState(20);
  const [lengthM, setLengthM] = useState(6);
  const metres = Math.max(0, bars) * Math.max(0, lengthM);
  const result = barTakeOff(diameter, metres);
  const product = Y_BARS.find((p) => p.diameterMm === diameter);
  const input = "mt-1 w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm";

  return (
    <div className="rounded-sm border border-basalt/15 bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">Rebar mass calculator</p>
      <div className={`mt-3 grid gap-3 ${compact ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3"}`}>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Bar size</span>
          <select value={diameter} onChange={(e) => setDiameter(Number(e.target.value))} className={input}>
            {diameters.map((d) => (
              <option key={d} value={d}>
                Y{d} / R{d} ({d} mm)
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Number of bars</span>
          <input type="number" min={0} step={1} value={bars} onChange={(e) => setBars(Math.max(0, Math.round(Number(e.target.value) || 0)))} className={input} />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Length each (m)</span>
          <input type="number" min={0} step={0.1} value={lengthM} onChange={(e) => setLengthM(Math.max(0, Number(e.target.value) || 0))} className={input} />
        </label>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 font-body text-sm sm:grid-cols-4" aria-live="polite">
        {[
          ["Total length", `${(Math.round(metres * 10) / 10).toLocaleString("en-US")} m`],
          ["Mass per metre", `${result.kgPerM} kg/m`],
          ["Total mass", `${result.kg.toLocaleString("en-US")} kg (${result.tonnes.toLocaleString("en-US")} t)`],
          ["6 m lengths", lengthM > 6 ? "Longer than 6 m — order 12 m or cut & bend" : `${result.lengths} (no laps or offcuts)`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-sm bg-limestone/70 p-2">
            <dt className="text-[11px] text-slate">{label}</dt>
            <dd className="font-semibold text-basalt">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 font-body text-[11px] text-slate">
        SANS 920 nominal mass. Add laps, hooks and offcuts as your engineer specifies — for bent bars, send us the bar bending schedule.
        {product && !compact && (
          <>
            {" "}
            <Link href={`/products/${product.slug}`} className="text-seam-blue hover:underline">
              Order {product.name.split(" (")[0]} →
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
