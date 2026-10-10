"use client";

import Link from "next/link";
import { useState } from "react";
import { BREAKAGE, wallTakeOff } from "@/data/masonry";
import { formatZAR } from "@/lib/pricing";

export type WallingOption = { sku: string; slug: string; name: string; unitsPerM2: number; unit: string; price: number | null };

const input = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";
const label = "font-mono text-[10px] uppercase text-slate";
const num = (n: number, dp = 0) => n.toLocaleString("en-US", { maximumFractionDigits: dp });

/**
 * How many bricks or blocks a wall takes: (length × height − openings) ×
 * units per m² of one leaf (10 mm joints) × leaves, plus a 5% breakage
 * allowance. Bricks are ordered per 1,000, so the order rounds up to the
 * next thousand.
 */
export function WallCalculator({ options }: { options: WallingOption[] }) {
  const [sku, setSku] = useState(options[0]?.sku ?? "");
  const [length, setLength] = useState(10);
  const [height, setHeight] = useState(2.4);
  const [openings, setOpenings] = useState(0);
  const [leaves, setLeaves] = useState(1);
  const option = options.find((o) => o.sku === sku) ?? options[0];
  if (!option) return null;
  const area = Math.max(0, length * height - openings);
  const { net, withBreakage } = wallTakeOff(option.unitsPerM2, area, leaves);
  const perThousand = option.unit === "THOUSAND";
  const orderQty = perThousand ? Math.ceil(withBreakage / 1000) : withBreakage;
  const cost = option.price !== null ? orderQty * option.price : null;
  const href = `/quote?sku=${option.sku}&unit=${option.unit}&qty=${orderQty}`;

  return (
    <div className="rounded-sm border border-basalt/10 bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">Wall calculator</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {options.length > 1 && (
          <label className="col-span-2 block">
            <span className={label}>Brick or block</span>
            <select value={sku} onChange={(e) => setSku(e.target.value)} className={input}>
              {options.map((o) => (
                <option key={o.sku} value={o.sku}>{o.name}</option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className={label}>Wall length (m)</span>
          <input type="number" min={0} step={0.1} value={length} onChange={(e) => setLength(Math.max(0, Number(e.target.value) || 0))} className={input} />
        </label>
        <label className="block">
          <span className={label}>Wall height (m)</span>
          <input type="number" min={0} step={0.1} value={height} onChange={(e) => setHeight(Math.max(0, Number(e.target.value) || 0))} className={input} />
        </label>
        <label className="block">
          <span className={label}>Doors &amp; windows (m²)</span>
          <input type="number" min={0} step={0.1} value={openings} onChange={(e) => setOpenings(Math.max(0, Number(e.target.value) || 0))} className={input} />
        </label>
        <label className="block">
          <span className={label}>Wall thickness</span>
          <select value={leaves} onChange={(e) => setLeaves(Number(e.target.value))} className={input}>
            <option value={1}>Single leaf</option>
            <option value={2}>Double leaf (e.g. 220 mm brick wall)</option>
          </select>
        </label>
      </div>
      <dl className="mt-4 space-y-1 font-body text-sm text-basalt">
        <div className="flex justify-between">
          <dt className="text-slate">Wall area</dt>
          <dd>{num(area, 2)} m²</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">At {num(option.unitsPerM2, 1)} per m² × {leaves} leaf{leaves > 1 ? "s" : ""}</dt>
          <dd>{num(net)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate">Plus {Math.round(BREAKAGE * 100)}% breakage</dt>
          <dd>{num(withBreakage)}</dd>
        </div>
      </dl>
      <div className="mt-3 rounded-sm bg-basalt px-4 py-3 font-body text-sm text-limestone">
        Order <strong>{perThousand ? `${num(orderQty)} × 1,000 bricks` : `${num(orderQty)} blocks`}</strong>
        {cost !== null && <> · about <strong>{formatZAR(cost)}</strong> at list price</>}
        <span className="block text-xs text-limestone/70">10 mm mortar joints; your builder&apos;s take-off and the drawings govern.</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-body text-sm">
        {options.length > 1 && <Link href={`/products/${option.slug}`} className="font-semibold text-seam-blue hover:underline">View {option.name} →</Link>}
        <Link href={href} className="font-semibold text-seam-blue hover:underline">Quote this quantity →</Link>
      </div>
    </div>
  );
}
