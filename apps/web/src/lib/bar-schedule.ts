/**
 * Bar bending schedule helpers for the browser: live mass totals while the
 * customer types, and CSV import. The API (apps/api/src/cut-and-bend/
 * bar-schedule.ts) re-validates and re-totals everything — these numbers are
 * only a preview.
 */
import { BAR_MASS_KG_PER_M } from "@/data/steel";

export type BarType = "Y" | "R";
export const DIAMETERS: Record<BarType, number[]> = { Y: [8, 10, 12, 16, 20, 25, 32, 40], R: [8, 10, 12, 16, 20, 25] };
export const MAX_ROWS = 500;

export type ScheduleRow = {
  barMark: string;
  member: string;
  barType: BarType;
  diameterMm: number;
  shapeCode: string;
  members: number;
  barsPerMember: number;
  lengthMm: number;
};

export const blankRow = (barMark = ""): ScheduleRow => ({ barMark, member: "", barType: "Y", diameterMm: 12, shapeCode: "00", members: 1, barsPerMember: 1, lengthMm: 6000 });

export function rowMassKg(r: ScheduleRow): number {
  const kgPerM = BAR_MASS_KG_PER_M[r.diameterMm] ?? 0;
  const bars = Math.max(0, r.members) * Math.max(0, r.barsPerMember);
  return Math.round(((bars * Math.max(0, r.lengthMm) * kgPerM) / 1000) * 1000) / 1000;
}

export type SizeTotal = { size: string; diameterMm: number; bars: number; metres: number; massKg: number };

export function totalsBySize(rows: ScheduleRow[]): { bySize: SizeTotal[]; totalMassKg: number } {
  const map = new Map<string, SizeTotal>();
  for (const r of rows) {
    const size = `${r.barType}${r.diameterMm}`;
    const t = map.get(size) ?? { size, diameterMm: r.diameterMm, bars: 0, metres: 0, massKg: 0 };
    const bars = r.members * r.barsPerMember;
    t.bars += bars;
    t.metres += (bars * r.lengthMm) / 1000;
    t.massKg += rowMassKg(r);
    map.set(size, t);
  }
  const bySize = [...map.values()].sort((a, b) => b.diameterMm - a.diameterMm || a.size.localeCompare(b.size));
  return { bySize, totalMassKg: Math.round(bySize.reduce((s, t) => s + t.massKg, 0) * 100) / 100 };
}

/** One CSV line into cells, honouring quotes. */
function cells(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === "," || c === ";") {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

const HEADERS: Record<keyof ScheduleRow, RegExp> = {
  barMark: /^(bar\s*)?mark/i,
  member: /^member/i,
  barType: /^(bar\s*)?type/i,
  diameterMm: /^(size|dia)/i,
  shapeCode: /^shape/i,
  members: /^(no\.?\s*(of\s*)?members|members)/i,
  barsPerMember: /^(bars\s*per|no\.?\s*(of\s*)?bars\s*(in|per)|bars\/member)/i,
  lengthMm: /^(cut\s*)?length/i,
};

/**
 * Rows from a CSV schedule (our template's columns, in any order; extra
 * columns ignored). A size written "Y12" or "R8" also sets the bar type.
 */
export function parseScheduleCsv(text: string): { rows: ScheduleRow[]; errors: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["The file has no schedule rows under a header line."] };
  const header = cells(lines[0]);
  const index = Object.fromEntries(Object.entries(HEADERS).map(([key, re]) => [key, header.findIndex((h) => re.test(h))])) as Record<keyof ScheduleRow, number>;
  const missing = (["barMark", "diameterMm", "members", "barsPerMember", "lengthMm"] as const).filter((k) => index[k] < 0);
  if (missing.length) return { rows: [], errors: ["The header must include Bar mark, Size (mm), No. of members, Bars per member and Cut length (mm) — use our template."] };
  const rows: ScheduleRow[] = [];
  const errors: string[] = [];
  for (const [i, line] of lines.slice(1).entries()) {
    if (rows.length >= MAX_ROWS) {
      errors.push(`Only the first ${MAX_ROWS} rows were imported — attach the full schedule as a file.`);
      break;
    }
    const c = cells(line);
    const get = (k: keyof ScheduleRow) => (index[k] >= 0 ? (c[index[k]] ?? "") : "");
    const sizeText = get("diameterMm").toUpperCase();
    const typeText = (get("barType") || sizeText.match(/^[YR]/)?.[0] || "Y").toUpperCase();
    const row: ScheduleRow = {
      barMark: get("barMark"),
      member: get("member"),
      barType: typeText === "R" ? "R" : "Y",
      diameterMm: Number(sizeText.replace(/^[YR]/, "")),
      shapeCode: (get("shapeCode") || "00").padStart(2, "0"),
      members: Number(get("members")),
      barsPerMember: Number(get("barsPerMember")),
      lengthMm: Number(get("lengthMm").replace(/\s/g, "")),
    };
    if (!row.barMark && !row.diameterMm) continue; // blank or subtotal line
    if (!DIAMETERS[row.barType].includes(row.diameterMm) || !(row.members > 0) || !(row.barsPerMember > 0) || !(row.lengthMm > 0)) {
      errors.push(`Line ${i + 2} (${row.barMark || "no mark"}) couldn't be read — check its size, quantities and length.`);
      continue;
    }
    rows.push(row);
  }
  return { rows, errors };
}

export const STATUS_LABEL: Record<string, string> = {
  NEW: "Received",
  IN_REVIEW: "Being priced",
  QUOTED: "Quoted",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  CLOSED: "Closed",
};

export type ScheduleSummary = {
  id: string;
  reference: string;
  status: string;
  contactName: string;
  companyName: string | null;
  projectName: string | null;
  province: string | null;
  requiredBy: string | null;
  lineCount: number;
  totalMassKg: number;
  fileName: string | null;
  quotedAmount: number | null;
  quoteValidUntil: string | null;
  createdAt: string;
};

export type ScheduleDetail = ScheduleSummary & {
  contactEmail: string;
  contactPhone: string | null;
  siteAddress: string | null;
  message: string | null;
  quoteNotes: string | null;
  quotedAt: string | null;
  respondedAt: string | null;
  staffNotes?: string | null;
  lines: (ScheduleRow & { id: string; position: number; bars: number; massKg: number; member: string | null })[];
  bySize: { barType: BarType; diameterMm: number; bars: number; metres: number; massKg: number }[];
};

export const kg = (n: number) => `${n.toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`;
