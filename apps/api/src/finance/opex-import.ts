import { parse } from "csv-parse/sync";
import { OperatingCostCategory } from "@aggregates/database";

/**
 * Operating costs from an accounting export (ANALYTICS.md, Phase 4). Any
 * package works — Xero, Sage, QuickBooks or a spreadsheet — as long as the CSV
 * has a month (or date), a description and an amount excluding VAT. Column
 * names are matched loosely; categories map from our names or common account
 * words, else "Other". Nothing is guessed silently: every row shows the
 * category it mapped to before it's saved.
 */

export type ImportedCost = {
  line: number;
  month: string; // YYYY-MM
  category: OperatingCostCategory;
  categoryMatched: boolean; // false = fell back to OTHER
  description: string;
  amountExVat: number;
  reference: string | null;
};
export type ImportError = { line: number; message: string };

const COLUMNS = {
  month: ["month", "period", "date", "transaction date", "posting date"],
  category: ["category", "account", "account name", "account type", "expense category"],
  description: ["description", "memo", "details", "narration", "name", "payee"],
  amount: ["amount_ex_vat", "amountexvat", "amount ex vat", "amount excl vat", "amount (excl. vat)", "net", "net amount", "amount", "debit"],
  reference: ["reference", "ref", "account code", "code", "invoice number", "journal"],
} as const;

const KEYWORDS: [RegExp, OperatingCostCategory][] = [
  [/salar|wage|payroll|staff cost|uif|sdl|paye/i, "SALARIES"],
  [/rent|lease|premises|office space|municipal|rates/i, "RENT"],
  [/market|advert|promotion|google ads|facebook|meta ads|seo/i, "MARKETING"],
  [/software|hosting|subscription|saas|cloud|domain|licen[cs]e|internet/i, "SOFTWARE"],
  [/vehicle|fuel|petrol|diesel|toll|tyre|car /i, "VEHICLES"],
  [/legal|audit|accounting|bookkeep|professional|consult|attorney/i, "PROFESSIONAL_FEES"],
  [/bank|card fee|merchant|transaction fee|gateway fee/i, "BANK_CHARGES"],
  [/insur/i, "INSURANCE"],
];

const LABELS: Record<string, OperatingCostCategory> = {
  "salaries & wages": "SALARIES",
  "rent & premises": "RENT",
  "marketing & advertising": "MARKETING",
  "software & hosting": "SOFTWARE",
  "vehicles & fuel": "VEHICLES",
  "professional fees": "PROFESSIONAL_FEES",
  "bank & card charges": "BANK_CHARGES",
  insurance: "INSURANCE",
  other: "OTHER",
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function toMonth(value: string): string | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?/); // 2026-10, 2026-10-31, 2026/10/31
  if (m) return valid(+m[1], +m[2]);
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/); // 31/10/2026 (day first, South African style)
  if (m) return valid(+m[3], +m[2]);
  m = v.match(/^([A-Za-z]{3,9})[\s-]+(\d{4})$/); // Oct 2026, October-2026
  if (m) {
    const i = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase());
    return i >= 0 ? valid(+m[2], i + 1) : null;
  }
  return null;
  function valid(y: number, mo: number) {
    return y >= 2000 && y <= 2100 && mo >= 1 && mo <= 12 ? `${y}-${String(mo).padStart(2, "0")}` : null;
  }
}

export function toCategory(...values: (string | undefined)[]): { category: OperatingCostCategory; matched: boolean } {
  for (const raw of values) {
    const v = (raw ?? "").trim();
    if (!v) continue;
    const key = v.toUpperCase().replace(/[\s&-]+/g, "_");
    if ((Object.values(OperatingCostCategory) as string[]).includes(key)) return { category: key as OperatingCostCategory, matched: true };
    const label = LABELS[v.toLowerCase()];
    if (label) return { category: label, matched: true };
    const hit = KEYWORDS.find(([re]) => re.test(v));
    if (hit) return { category: hit[1], matched: true };
  }
  return { category: "OTHER", matched: false };
}

export function toAmount(value: string): number | null {
  const v = value.trim().replace(/^R\s*/i, "").replace(/[\s,](?=\d{3}\b)/g, "").replace(/\s/g, "");
  const negative = /^\(.*\)$/.test(v) || v.startsWith("-");
  const n = Number(v.replace(/[()]/g, "").replace(/^-/, ""));
  if (!Number.isFinite(n)) return null;
  return negative ? -n : Math.round(n * 100) / 100;
}

export function parseOperatingCostCsv(text: string): { rows: ImportedCost[]; errors: ImportError[]; columns: Record<string, string | null> } {
  let records: Record<string, string>[];
  try {
    records = parse(text.replace(/^﻿/, ""), { columns: (h: string[]) => h.map((c) => c.trim().toLowerCase()), skip_empty_lines: true, trim: true, relax_column_count: true });
  } catch (error) {
    return { rows: [], errors: [{ line: 0, message: `Not a readable CSV file: ${(error as Error).message}` }], columns: {} };
  }
  if (!records.length) return { rows: [], errors: [{ line: 0, message: "The file has no rows." }], columns: {} };
  if (records.length > 2000) return { rows: [], errors: [{ line: 0, message: "Import up to 2,000 rows at a time." }], columns: {} };
  const headers = Object.keys(records[0]);
  const find = (names: readonly string[]) => names.find((n) => headers.includes(n)) ?? null;
  const columns = { month: find(COLUMNS.month), category: find(COLUMNS.category), description: find(COLUMNS.description), amount: find(COLUMNS.amount), reference: find(COLUMNS.reference) };
  const missing = (["month", "description", "amount"] as const).filter((k) => !columns[k]);
  if (missing.length) {
    return { rows: [], errors: [{ line: 1, message: `Couldn't find a column for: ${missing.join(", ")}. Expected e.g. month, category, description, amount_ex_vat.` }], columns };
  }
  const rows: ImportedCost[] = [];
  const errors: ImportError[] = [];
  records.forEach((r, i) => {
    const line = i + 2;
    const month = toMonth(r[columns.month!] ?? "");
    const amount = toAmount(r[columns.amount!] ?? "");
    const description = (r[columns.description!] ?? "").trim().slice(0, 200);
    const problems: string[] = [];
    if (!month) problems.push(`month "${r[columns.month!] ?? ""}" isn't a date or YYYY-MM`);
    if (amount === null) problems.push(`amount "${r[columns.amount!] ?? ""}" isn't a number`);
    else if (amount < 0) problems.push("amount is negative (credits and refunds aren't operating costs — net them off in your export)");
    if (description.length < 2) problems.push("description is empty");
    if (problems.length) {
      errors.push({ line, message: problems.join("; ") });
      return;
    }
    const { category, matched } = toCategory(columns.category ? r[columns.category] : undefined, description);
    rows.push({ line, month: month!, category, categoryMatched: matched, description, amountExVat: amount!, reference: columns.reference ? (r[columns.reference] || null)?.slice(0, 120) ?? null : null });
  });
  return { rows, errors, columns };
}
