/**
 * Bar bending schedule maths (STEEL_CATALOGUE.md, Phase S2). Mass is the
 * SANS 920 nominal mass per metre x the cut length x the number of bars —
 * the schedule's own cut length is used as given (the engineer's schedule
 * already includes bends to SANS 282), so nothing here guesses bend
 * allowances. Prices never come from here: staff quote with the merchant.
 */

/** SANS 920 nominal mass (kg/m) by bar diameter — the same table as services/pricing/data/steel_catalogue.json. */
export const BAR_MASS_KG_PER_M: Record<number, number> = { 8: 0.395, 10: 0.617, 12: 0.888, 16: 1.578, 20: 2.466, 25: 3.853, 32: 6.313, 40: 9.865 };

export const BAR_TYPES = ["Y", "R"] as const;
export type BarType = (typeof BAR_TYPES)[number];

/** Y-bar (450 MPa) comes 8–40 mm; plain R-bar (250 MPa) 8–25 mm. */
export const DIAMETERS: Record<BarType, number[]> = { Y: [8, 10, 12, 16, 20, 25, 32, 40], R: [8, 10, 12, 16, 20, 25] };

export const LIMITS = { lines: 500, members: 10_000, barsPerMember: 1_000, minLengthMm: 100, maxLengthMm: 13_000 } as const;

export type ScheduleLineInput = {
  barMark: string;
  member?: string | null;
  barType: string;
  diameterMm: number;
  shapeCode: string;
  members: number;
  barsPerMember: number;
  lengthMm: number;
};

export type ScheduleLine = {
  barMark: string;
  member: string | null;
  barType: BarType;
  diameterMm: number;
  shapeCode: string;
  members: number;
  barsPerMember: number;
  lengthMm: number;
  /** Bars of this mark in the whole schedule. */
  bars: number;
  massKg: number;
};

export type DiameterTotal = { barType: BarType; diameterMm: number; bars: number; metres: number; massKg: number };

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
const isWhole = (n: unknown, min: number, max: number) => typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;

/** Validates one row and works out its mass; returns an error message naming the row instead of throwing. */
export function scheduleLine(input: ScheduleLineInput, row: number): ScheduleLine | string {
  const at = `Row ${row}`;
  const barMark = String(input.barMark ?? "").trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ./-]{0,11}$/.test(barMark)) return `${at}: the bar mark must be 1–12 letters or numbers.`;
  const member = input.member == null ? null : String(input.member).trim().slice(0, 60) || null;
  const barType = String(input.barType ?? "").trim().toUpperCase();
  if (!BAR_TYPES.includes(barType as BarType)) return `${at}: the bar type must be Y (high-tensile) or R (mild steel).`;
  if (!DIAMETERS[barType as BarType].includes(input.diameterMm)) {
    return `${at}: ${barType}${input.diameterMm} isn't a stock size — ${barType}-bar comes in ${DIAMETERS[barType as BarType].join(", ")} mm.`;
  }
  const shapeCode = String(input.shapeCode ?? "").trim();
  if (!/^\d{2}$/.test(shapeCode)) return `${at}: the shape code must be the two-digit SANS 282 code (00 for a straight bar).`;
  if (!isWhole(input.members, 1, LIMITS.members)) return `${at}: the number of members must be a whole number from 1 to ${LIMITS.members.toLocaleString("en-US")}.`;
  if (!isWhole(input.barsPerMember, 1, LIMITS.barsPerMember)) return `${at}: bars per member must be a whole number from 1 to ${LIMITS.barsPerMember.toLocaleString("en-US")}.`;
  if (!isWhole(input.lengthMm, LIMITS.minLengthMm, LIMITS.maxLengthMm)) {
    return `${at}: the cut length must be in whole millimetres, ${LIMITS.minLengthMm}–${LIMITS.maxLengthMm.toLocaleString("en-US")} mm (longer runs need a lap).`;
  }
  const bars = input.members * input.barsPerMember;
  const massKg = round((bars * input.lengthMm * BAR_MASS_KG_PER_M[input.diameterMm]) / 1000, 3);
  return { barMark, member, barType: barType as BarType, diameterMm: input.diameterMm, shapeCode, members: input.members, barsPerMember: input.barsPerMember, lengthMm: input.lengthMm, bars, massKg };
}

/** Every row, or every row's error. */
export function scheduleLines(inputs: ScheduleLineInput[]): { lines: ScheduleLine[]; errors: string[] } {
  const lines: ScheduleLine[] = [];
  const errors: string[] = [];
  inputs.forEach((input, i) => {
    const result = scheduleLine(input, i + 1);
    if (typeof result === "string") errors.push(result);
    else lines.push(result);
  });
  return { lines, errors };
}

/** Totals by bar type and size, largest first — the merchant prices steel by the tonne per size. */
export function totalsBySize(lines: Pick<ScheduleLine, "barType" | "diameterMm" | "bars" | "lengthMm" | "massKg">[]): { bySize: DiameterTotal[]; totalMassKg: number } {
  const map = new Map<string, DiameterTotal>();
  for (const l of lines) {
    const key = `${l.barType}${l.diameterMm}`;
    const t = map.get(key) ?? { barType: l.barType, diameterMm: l.diameterMm, bars: 0, metres: 0, massKg: 0 };
    t.bars += l.bars;
    t.metres += (l.bars * l.lengthMm) / 1000;
    t.massKg += l.massKg;
    map.set(key, t);
  }
  const bySize = [...map.values()]
    .map((t) => ({ ...t, metres: round(t.metres, 2), massKg: round(t.massKg, 2) }))
    .sort((a, b) => b.diameterMm - a.diameterMm || a.barType.localeCompare(b.barType));
  return { bySize, totalMassKg: round(bySize.reduce((sum, t) => sum + t.massKg, 0), 2) };
}

const csvCell = (value: string | number | null) => {
  const text = value === null ? "" : String(value);
  // Quote, and neutralise spreadsheet formulas.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const CSV_HEADER = ["Bar mark", "Member", "Type", "Size (mm)", "Shape code", "No. of members", "Bars per member", "Total bars", "Cut length (mm)", "Mass (kg)"];

/** The schedule as CSV, for staff to send to the merchant. */
export function scheduleCsv(lines: (Pick<ScheduleLine, "barMark" | "member" | "barType" | "diameterMm" | "shapeCode" | "members" | "barsPerMember" | "lengthMm"> & { massKg: number })[]): string {
  const rows = lines.map((l) => [l.barMark, l.member, l.barType, l.diameterMm, l.shapeCode, l.members, l.barsPerMember, l.members * l.barsPerMember, l.lengthMm, l.massKg]);
  return [CSV_HEADER, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const MAX_SCHEDULE_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Schedule files: PDF, PNG/JPEG (a photo of a drawing), Excel (.xlsx — a
 * zip whose entries include xl/) or CSV (plain text). Identified by content.
 */
export function detectScheduleFileType(body: Buffer, originalName: string | undefined): { contentType: string; extension: string } | null {
  const starts = (magic: number[]) => magic.every((byte, i) => body[i] === byte);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return { contentType: "application/pdf", extension: "pdf" };
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { contentType: "image/png", extension: "png" };
  if (starts([0xff, 0xd8, 0xff])) return { contentType: "image/jpeg", extension: "jpg" };
  if (starts([0x50, 0x4b, 0x03, 0x04]) && body.includes(Buffer.from("xl/"))) {
    return { contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" };
  }
  const isCsvName = /\.csv$/i.test(originalName ?? "");
  if (isCsvName && body.length > 0 && !body.includes(0) && Buffer.from(body.toString("utf8"), "utf8").equals(body)) {
    return { contentType: "text/csv", extension: "csv" };
  }
  return null;
}
