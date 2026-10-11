"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { findQuotable } from "@/data/quotable";
import { BREAKAGE } from "@/data/masonry";
import { SHEET_LENGTHS, sheetTakeOff } from "@/data/roofing";
import { cart } from "@/lib/cart";
import { formatZAR } from "@/lib/pricing";

export type SheetOption = { sku: string; name: string; profile: string; coverWidthMm: number; ratePerMetre: number | null };
export type TileOption = { sku: string; name: string; unitsPerM2: number };

type Line = { sku: string; name: string; unit: string; quantity: number; detail: string; price: number | null };

const input = "mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";
const label = "font-mono text-[10px] uppercase text-slate";
const num = (n: number, dp = 1) => n.toLocaleString("en-US", { maximumFractionDigits: dp });

/** Retail list price of a unit, or null when it's quoted. */
function priceOf(sku: string, unit: string) {
  return findQuotable(sku)?.units.find((u) => u.code === unit)?.retailPrice ?? null;
}

/** Ridge capping comes in ~3.6 m lengths lapped 150 mm. */
const RIDGE_PIECE_M = 3.45;
/** Glass-wool and polyester rolls: 1.2 × 5 m. */
const INSULATION_ROLL_M2 = 6;
/** Usable cover of an underlay roll after laps: foil 1.25 × 40 m, membrane 1.5 × 30 m, less about 10%. */
const FOIL_ROLL_M2 = 45;
const MEMBRANE_ROLL_M2 = 40;
const GUTTER_LENGTH_M = 6;
/** One downpipe for every 12 m of gutter or part of it; one 3 m length each (single storey). */
const GUTTER_PER_DOWNPIPE_M = 12;

/**
 * Roof take-off from the building's plan size: a gable (two slopes) or a
 * lean-to (one slope), the pitch, and the overhangs. Sheets per slope come
 * from the sheet's cover width and the slope length — a standard length
 * where one fits, otherwise cut to length on a quote. Tiles are the roof area
 * × the tile's coverage plus 5%. Ceiling insulation follows the footprint;
 * gutters and downpipes follow the eaves. Hipped roofs need the plan — send
 * it with a quote.
 */
export function RoofCalculator({ sheets, tiles }: { sheets: SheetOption[]; tiles: TileOption[] }) {
  const [covering, setCovering] = useState<"sheet" | "tile">("sheet");
  const [shape, setShape] = useState<"gable" | "leanto">("gable");
  const [length, setLength] = useState("12");
  const [width, setWidth] = useState("8");
  const [pitch, setPitch] = useState("15");
  const [eaves, setEaves] = useState("0.5");
  const [gable, setGable] = useState("0.3");
  const [sheetSku, setSheetSku] = useState(sheets.find((s) => s.ratePerMetre !== null)?.sku ?? sheets[0]?.sku);
  const [tileSku, setTileSku] = useState(tiles[0]?.sku);
  const [insulation, setInsulation] = useState(true);
  const [gutters, setGutters] = useState(true);
  const [added, setAdded] = useState<string | null>(null);

  const result = useMemo(() => {
    const L = Number(length);
    const W = Number(width);
    const P = Number(pitch);
    const E = Math.max(0, Number(eaves) || 0);
    const G = Math.max(0, Number(gable) || 0);
    if (!(L > 0 && W > 0 && P >= 0 && P < 60)) return null;
    const slopes = shape === "gable" ? 2 : 1;
    const cos = Math.cos((P * Math.PI) / 180);
    const run = (shape === "gable" ? W / 2 : W) + E; // horizontal, wall line to ridge plus eaves overhang
    const slopeLength = run / cos;
    const slopeWidth = L + 2 * G;
    const roofArea = slopes * slopeLength * slopeWidth;
    const eavesRun = slopes * L;
    const lines: Line[] = [];
    let cutting: { cutLengthM: number; count: number } | null = null;

    if (covering === "sheet") {
      const sheet = sheets.find((s) => s.sku === sheetSku);
      if (!sheet) return null;
      const t = sheetTakeOff(slopeLength, slopeWidth, sheet.coverWidthMm); // adds 50 mm into the gutter
      const count = t.sheets * slopes;
      if (t.standardUnit) {
        lines.push({ sku: sheet.sku, name: sheet.name, unit: t.standardUnit, quantity: count, detail: `${count} × ${num(SHEET_LENGTHS[t.standardUnit])} m sheets`, price: priceOf(sheet.sku, t.standardUnit) });
      } else {
        cutting = { cutLengthM: t.cutLengthM, count };
        const metres = Math.ceil(count * t.cutLengthM);
        lines.push({ sku: sheet.sku, name: sheet.name, unit: "METRE", quantity: metres, detail: `${count} sheets cut to ${num(t.cutLengthM)} m (${num(count * t.cutLengthM)} m)`, price: null });
      }
      if (shape === "gable") {
        const ridgeSku = sheet.profile === "IBR" ? "AA-ROF-RIDGE-IBR" : sheet.profile === "Corrugated" ? "AA-ROF-RIDGE-ROLLTOP" : null;
        if (ridgeSku) {
          const pieces = Math.ceil(slopeWidth / RIDGE_PIECE_M);
          lines.push({ sku: ridgeSku, name: findQuotable(ridgeSku)?.name ?? "Ridge capping", unit: "EACH", quantity: pieces, detail: `${pieces} lengths for ${num(slopeWidth)} m of ridge`, price: priceOf(ridgeSku, "EACH") });
        }
      }
      const foil = Math.ceil(roofArea / FOIL_ROLL_M2);
      lines.push({ sku: "AA-ROF-UNDERLAY-FOIL", name: "Reflective foil roof underlay", unit: "ROLL", quantity: foil, detail: `${foil} roll${foil === 1 ? "" : "s"} for ${num(roofArea)} m² of roof`, price: priceOf("AA-ROF-UNDERLAY-FOIL", "ROLL") });
    } else {
      const tile = tiles.find((x) => x.sku === tileSku);
      if (!tile) return null;
      const count = Math.ceil(roofArea * tile.unitsPerM2 * (1 + BREAKAGE));
      lines.push({ sku: tile.sku, name: tile.name, unit: "EACH", quantity: count, detail: `${count.toLocaleString("en-US")} tiles for ${num(roofArea)} m² (incl. 5% breakage)`, price: priceOf(tile.sku, "EACH") });
      const membrane = Math.ceil(roofArea / MEMBRANE_ROLL_M2);
      lines.push({ sku: "AA-ROF-UNDERLAY-MEMBRANE", name: "Under-tile membrane", unit: "ROLL", quantity: membrane, detail: `${membrane} roll${membrane === 1 ? "" : "s"}`, price: priceOf("AA-ROF-UNDERLAY-MEMBRANE", "ROLL") });
    }
    if (insulation) {
      const rolls = Math.ceil((L * W) / INSULATION_ROLL_M2);
      lines.push({ sku: "AA-ROF-INSUL-GLASSWOOL-135", name: "Glass-wool ceiling insulation 135 mm", unit: "ROLL", quantity: rolls, detail: `${rolls} rolls for ${num(L * W)} m² of ceiling`, price: priceOf("AA-ROF-INSUL-GLASSWOOL-135", "ROLL") });
    }
    if (gutters) {
      const gutterLengths = slopes * Math.ceil(L / GUTTER_LENGTH_M);
      const downpipes = slopes * Math.max(1, Math.ceil(L / GUTTER_PER_DOWNPIPE_M));
      lines.push({ sku: "AA-ROF-GUTTER-PVC-6M", name: "PVC gutter, 6 m", unit: "EACH", quantity: gutterLengths, detail: `${gutterLengths} × 6 m for ${num(eavesRun)} m of eaves`, price: priceOf("AA-ROF-GUTTER-PVC-6M", "EACH") });
      lines.push({ sku: "AA-ROF-DOWNPIPE-PVC-3M", name: "PVC downpipe, 3 m", unit: "EACH", quantity: downpipes, detail: `${downpipes} downpipe${downpipes === 1 ? "" : "s"}, one 3 m length each`, price: priceOf("AA-ROF-DOWNPIPE-PVC-3M", "EACH") });
    }
    return { roofArea, slopeLength, slopeWidth, slopes, lines, cutting };
  }, [covering, shape, length, width, pitch, eaves, gable, sheetSku, tileSku, insulation, gutters, sheets, tiles]);

  const priced = result?.lines.filter((l) => l.price !== null) ?? [];
  const pricedTotal = priced.reduce((t, l) => t + l.price! * l.quantity, 0);
  const quoteHref = result
    ? `/quote?${new URLSearchParams({
        lines: result.lines.map((l) => `${l.sku}~${l.unit}~${l.quantity}`).join(","),
        notes: (
          `Roof calculator: ${shape === "gable" ? "gable" : "lean-to"} roof ${length} × ${width} m at ${pitch}°, ${num(result.roofArea)} m².` +
          (result.cutting ? ` Cut to length: ${result.cutting.count} x ${num(result.cutting.cutLengthM)} m.` : "")
        ).slice(0, 500),
      }).toString()}`
    : "#";

  function addToCart() {
    for (const l of priced) cart.add({ sku: l.sku, unit: l.unit, quantity: l.quantity });
    setAdded(`${priced.length} priced line${priced.length === 1 ? "" : "s"} added to your cart.`);
  }

  return (
    <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
      <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">Roof calculator</p>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Roof covering">
        {(["sheet", "tile"] as const).map((c) => (
          <button key={c} type="button" aria-pressed={covering === c} onClick={() => setCovering(c)} className={`rounded-sm border px-3 py-1.5 font-body text-xs ${covering === c ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 bg-white text-basalt"}`}>
            {c === "sheet" ? "Roof sheeting" : "Concrete tiles"}
          </button>
        ))}
        {(["gable", "leanto"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={shape === s} onClick={() => setShape(s)} className={`rounded-sm border px-3 py-1.5 font-body text-xs ${shape === s ? "border-basalt bg-basalt text-limestone" : "border-basalt/20 bg-white text-basalt"}`}>
            {s === "gable" ? "Gable (two slopes)" : "Lean-to (one slope)"}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className={label}>{covering === "sheet" ? "Sheet" : "Tile"}</span>
        {covering === "sheet" ? (
          <select value={sheetSku} onChange={(e) => setSheetSku(e.target.value)} className={input}>
            {sheets.map((s) => (
              <option key={s.sku} value={s.sku}>
                {s.name}
                {s.ratePerMetre !== null ? ` — ${formatZAR(s.ratePerMetre)}/m` : " — quoted"}
              </option>
            ))}
          </select>
        ) : (
          <select value={tileSku} onChange={(e) => setTileSku(e.target.value)} className={input}>
            {tiles.map((t) => (
              <option key={t.sku} value={t.sku}>{t.name}</option>
            ))}
          </select>
        )}
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={label}>Building length (m)</span>
          <input inputMode="decimal" value={length} onChange={(e) => setLength(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className={label}>{shape === "gable" ? "Building width / span (m)" : "Wall to wall (m)"}</span>
          <input inputMode="decimal" value={width} onChange={(e) => setWidth(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className={label}>Roof pitch (°)</span>
          <input inputMode="decimal" value={pitch} onChange={(e) => setPitch(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className={label}>Eaves overhang (m)</span>
          <input inputMode="decimal" value={eaves} onChange={(e) => setEaves(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className={label}>Gable overhang (m)</span>
          <input inputMode="decimal" value={gable} onChange={(e) => setGable(e.target.value)} className={input} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-body text-xs text-basalt">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={insulation} onChange={(e) => setInsulation(e.target.checked)} className="accent-seam-blue" /> Ceiling insulation
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={gutters} onChange={(e) => setGutters(e.target.checked)} className="accent-seam-blue" /> Gutters &amp; downpipes
        </label>
      </div>

      {result ? (
        <div className="mt-4">
          <p className="font-body text-sm text-basalt">
            Roof area <strong>{num(result.roofArea)} m²</strong> · slope {num(result.slopeLength, 2)} m × {num(result.slopeWidth, 2)} m{result.slopes === 2 ? " × 2" : ""}
          </p>
          <ul className="mt-3 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white">
            {result.lines.map((l) => (
              <li key={`${l.sku}-${l.unit}`} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 font-body text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-basalt">{l.name}</span>
                  <span className="block text-xs text-slate">{l.detail}</span>
                </span>
                <span className="text-right text-basalt">{l.price !== null ? formatZAR(Math.round(l.price * l.quantity * 100) / 100) : <span className="text-xs text-slate">On quote</span>}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {priced.length > 0 && (
              <button type="button" onClick={addToCart} className="rounded-sm bg-basalt px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-seam-blue">
                Add {priced.length} priced line{priced.length === 1 ? "" : "s"} to cart · {formatZAR(Math.round(pricedTotal * 100) / 100)}
              </button>
            )}
            <Link href={quoteHref} className="rounded-sm border border-seam-blue px-4 py-2 font-body text-sm font-semibold text-seam-blue hover:bg-seam-blue/5">
              Request a quote for everything
            </Link>
            {added && (
              <span role="status" className="font-body text-xs text-seam-blue">
                {added} <Link href="/cart" className="font-semibold underline">View cart</Link>
              </span>
            )}
          </div>
          <p className="mt-3 font-body text-[11px] text-slate">
            A guide for ordering: sheets overhang into the gutter by 50 mm and lap 200 mm end to end only where a slope is longer than 14 m; tiles include 5% for breakage; underlay allows about 10% for laps.
            Roof screws, closures and barge flashings depend on the purlin and batten layout — your roofer or the merchant confirms them. Hipped roofs: send the plan with a quote. The truss
            design and your drawings govern.
          </p>
        </div>
      ) : (
        <p className="mt-4 font-body text-sm text-slate">Enter the building&apos;s length, width and a pitch under 60°.</p>
      )}
    </div>
  );
}
