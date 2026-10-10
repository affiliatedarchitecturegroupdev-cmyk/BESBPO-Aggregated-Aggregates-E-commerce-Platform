"use client";

import Link from "next/link";
import { useState } from "react";
import { formatZAR } from "@/lib/pricing";

export type DrainStoneOption = { sku: string; slug: string; name: string; densityKgPerM3: number; pricePerTon: number | null };

const input = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";
const label = "font-mono text-[10px] uppercase text-slate";
const num = (n: number, dp = 0) => n.toLocaleString("en-US", { maximumFractionDigits: dp });

/** Geotextile roll the calculator counts in (1.76 m × 100 m), and the lap allowed where the wrap closes over the top. */
const ROLL_M2 = 176;
const LAP_M = 0.3;
const PIPE_OUTSIDE_RADIUS_M = 0.055;

/**
 * A French drain, from the trench: 110 mm perforated pipe in 6 m lengths;
 * stone to fill the trench less the pipe; and geotextile to line the trench
 * (both sides and the base) and close over the top with a lap. Tonnes are
 * the stone's bulk density × volume; add your own allowance for waste.
 */
export function FrenchDrainCalculator({ stones }: { stones: DrainStoneOption[] }) {
  const [sku, setSku] = useState(stones[0]?.sku ?? "");
  const [length, setLength] = useState(20);
  const [width, setWidth] = useState(0.3);
  const [depth, setDepth] = useState(0.6);
  const stone = stones.find((s) => s.sku === sku) ?? stones[0];
  if (!stone) return null;
  const pipes = length > 0 ? Math.ceil(length / 6) : 0;
  const trenchM3 = Math.max(0, length * width * depth);
  const stoneM3 = Math.max(0, trenchM3 - Math.PI * PIPE_OUTSIDE_RADIUS_M ** 2 * length);
  const tons = (stoneM3 * stone.densityKgPerM3) / 1000;
  const fabricM2 = Math.max(0, length * (2 * depth + 2 * width + LAP_M));
  const rolls = fabricM2 > 0 ? Math.ceil(fabricM2 / ROLL_M2) : 0;
  const stoneCost = stone.pricePerTon !== null ? Math.round(tons * 100) / 100 * stone.pricePerTon : null;

  return (
    <div className="rounded-sm border border-basalt/10 bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">French drain calculator</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="col-span-2 block">
          <span className={label}>Drainage stone</span>
          <select value={sku} onChange={(e) => setSku(e.target.value)} className={input}>
            {stones.map((s) => (
              <option key={s.sku} value={s.sku}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block">
          <span className={label}>Drain length (m)</span>
          <input type="number" min={0} step={1} value={length} onChange={(e) => setLength(Math.max(0, Number(e.target.value) || 0))} className={input} />
        </label>
        <label className="block">
          <span className={label}>Trench width (m)</span>
          <input type="number" min={0} step={0.05} value={width} onChange={(e) => setWidth(Math.max(0, Number(e.target.value) || 0))} className={input} />
        </label>
        <label className="block">
          <span className={label}>Trench depth (m)</span>
          <input type="number" min={0} step={0.05} value={depth} onChange={(e) => setDepth(Math.max(0, Number(e.target.value) || 0))} className={input} />
        </label>
      </div>
      <dl className="mt-4 space-y-1 font-body text-sm text-basalt">
        <div className="flex justify-between">
          <dt className="text-slate">Perforated pipe, 110 mm × 6 m</dt>
          <dd>{num(pipes)} length{pipes === 1 ? "" : "s"}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Stone (trench less pipe)</dt>
          <dd>
            {num(stoneM3, 2)} m³ ≈ {num(tons, 2)} t
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Geotextile wrap</dt>
          <dd>
            {num(fabricM2, 1)} m² → {num(rolls)} roll{rolls === 1 ? "" : "s"} (1.76 × 100 m)
          </dd>
        </div>
      </dl>
      <div className="mt-3 rounded-sm bg-basalt px-4 py-3 font-body text-sm text-limestone">
        Stone: <strong>{num(tons, 2)} t</strong>
        {stoneCost !== null && (
          <>
            {" "}
            · about <strong>{formatZAR(stoneCost)}</strong> at list price
          </>
        )}
        <span className="block text-xs text-limestone/70">Pipe and geotextile are quoted with the supplier. Add an allowance for waste and over-dig.</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-body text-sm">
        <Link href={`/products/${stone.slug}`} className="font-semibold text-seam-blue hover:underline">
          View {stone.name} →
        </Link>
        <Link href={`/quote?lines=${encodeURIComponent(`${stone.sku}~ton~${Math.max(1, Math.ceil(tons))},AA-DRN-SUBSOIL-110~LENGTH_6M~${Math.max(1, pipes)},AA-GEO-NONWOVEN-A2~ROLL~${Math.max(1, rolls)}`)}&notes=${encodeURIComponent(`French drain: ${num(length)} m x ${width} m x ${depth} m`)}`} className="font-semibold text-seam-blue hover:underline">
          Quote the lot →
        </Link>
      </div>
    </div>
  );
}
