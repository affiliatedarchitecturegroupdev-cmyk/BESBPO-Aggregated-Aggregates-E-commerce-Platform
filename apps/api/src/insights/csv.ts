/** Removes the given keys at any depth (plain objects and arrays only). */
export function withoutKeys<T>(value: T, keys: readonly string[]): T {
  if (Array.isArray(value)) return value.map((v) => withoutKeys(v, keys)) as T;
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (keys.includes(k)) continue;
      out[k] = withoutKeys(v, keys);
    }
    return out as T;
  }
  return value;
}

/**
 * Rows to CSV (RFC 4180). Columns are the union of every row's keys, in first-
 * seen order. Text that a spreadsheet would read as a formula is prefixed with
 * an apostrophe, so a customer or product name can't run as one.
 */
export function toCsv(rows: Record<string, unknown>[]): string {
  const columns: string[] = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!columns.includes(k)) columns.push(k);
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n") + "\r\n";
}
