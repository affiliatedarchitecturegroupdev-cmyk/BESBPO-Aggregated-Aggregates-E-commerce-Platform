import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Building blocks for Insights pages: stat tiles with a signed change,
 * chart cards that always carry a table view, ranked bar lists with the
 * value at each bar's tip, and plain data tables.
 */

export function Delta({ value, goodWhenUp = true, vs }: { value: number | null | undefined; goodWhenUp?: boolean; vs?: string }) {
  if (value === null || value === undefined) return vs ? <span className="text-slate">— nothing in the {vs} to compare</span> : null;
  const up = value > 0;
  const flat = value === 0;
  const good = flat ? null : up === goodWhenUp;
  const color = good === null ? "text-slate" : good ? "text-[#006300]" : "text-[#b42318]";
  return (
    <span className={color}>
      <span aria-hidden>{flat ? "■" : up ? "▲" : "▼"}</span> {up ? "+" : ""}
      {value.toLocaleString("en-US", { maximumFractionDigits: 1 })}%{vs ? <span className="text-slate"> vs {vs}</span> : null}
    </span>
  );
}

export function StatTile({ label, value, delta, goodWhenUp, vs, note, adminOnly }: { label: string; value: string; delta?: number | null; goodWhenUp?: boolean; vs?: string; note?: ReactNode; adminOnly?: boolean }) {
  return (
    <div className="rounded-sm border border-basalt/10 bg-white p-4">
      <p className="font-body text-xs text-slate">
        {label}
        {adminOnly && <span className="ml-1 rounded-sm bg-limestone px-1 py-0.5 font-mono text-[10px] uppercase tracking-wide text-slate">Admin</span>}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-basalt">{value}</p>
      {(delta !== undefined || vs) && (
        <p className="mt-1 font-body text-xs">
          <Delta value={delta} goodWhenUp={goodWhenUp} vs={vs} />
        </p>
      )}
      {note && <p className="mt-1 font-body text-xs text-slate">{note}</p>}
    </div>
  );
}

export function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>;
}

export type Column<T> = { key: string; label: string; numeric?: boolean; render: (row: T) => ReactNode };

export function DataTable<T>({ columns, rows, empty = "Nothing in this period.", caption }: { columns: Column<T>[]; rows: T[]; empty?: string; caption?: string }) {
  if (!rows.length) return <p className="py-6 text-center font-body text-sm text-slate">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse font-body text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-basalt/10 text-left text-xs text-slate">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`px-2 py-2 font-medium ${c.numeric ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-basalt/5 last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={`px-2 py-1.5 text-basalt ${c.numeric ? "text-right tabular-nums" : ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A titled card holding a chart, with its data one click away as a table (and as CSV when given). */
export function ChartCard({ title, subtitle, children, table, csvHref, action, className = "" }: { title: string; subtitle?: ReactNode; children: ReactNode; table?: ReactNode; csvHref?: string; action?: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-sm border border-basalt/10 bg-white p-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-semibold text-basalt">{title}</h3>
          {subtitle && <p className="mt-0.5 font-body text-xs text-slate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 font-body text-xs">
          {action}
          {csvHref && (
            <a href={csvHref} className="text-seam-blue underline-offset-2 hover:underline">
              Download CSV
            </a>
          )}
        </div>
      </div>
      <div className="mt-3">{children}</div>
      {table && (
        <details className="mt-3 border-t border-basalt/10 pt-2">
          <summary className="cursor-pointer font-body text-xs text-seam-blue">Show as table</summary>
          <div className="mt-2">{table}</div>
        </details>
      )}
    </section>
  );
}

/** Ranked horizontal bars, value at the tip — every value is labelled, so no hover is needed. */
export function BarList({ rows, format, empty = "Nothing in this period.", color = "#2a78d6" }: { rows: { label: ReactNode; value: number; detail?: ReactNode; href?: string }[]; format: (n: number) => string; empty?: string; color?: string }) {
  if (!rows.length) return <p className="py-6 text-center font-body text-sm text-slate">{empty}</p>;
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 0) || 1;
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const width = Math.max(0, (Math.abs(r.value) / max) * 100);
        const label = r.href ? (
          <Link href={r.href} className="hover:underline">
            {r.label}
          </Link>
        ) : (
          r.label
        );
        return (
          <li key={i} className="font-body text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-basalt">{label}</span>
              <span className="shrink-0 tabular-nums text-basalt">{format(r.value)}</span>
            </div>
            <div className="mt-1 h-2 w-full rounded-r-[4px] bg-transparent">
              <div className="h-2 rounded-r-[4px]" style={{ width: `${width}%`, minWidth: r.value ? 2 : 0, background: color }} />
            </div>
            {r.detail && <p className="mt-0.5 text-xs text-slate">{r.detail}</p>}
          </li>
        );
      })}
    </ul>
  );
}

/** Stages of a funnel as ranked bars with the conversion from the stage before. */
export function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 0) || 1;
  return (
    <ol className="space-y-2">
      {stages.map((s, i) => {
        const prev = i > 0 ? stages[i - 1].value : null;
        return (
          <li key={s.label} className="font-body text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-basalt">{s.label}</span>
              <span className="tabular-nums text-basalt">
                {s.value.toLocaleString("en-US")}
                {prev !== null && <span className="ml-2 text-xs text-slate">{prev ? `${Math.round((s.value / prev) * 1000) / 10}% of previous` : "—"}</span>}
              </span>
            </div>
            <div className="mt-1 h-2 rounded-r-[4px]" style={{ width: `${(s.value / max) * 100}%`, minWidth: s.value ? 2 : 0, background: "#2a78d6" }} />
          </li>
        );
      })}
    </ol>
  );
}

/** Callouts about what a figure does or doesn't include (VAT basis, missing costs, filters). */
export function Notices({ items }: { items: (ReactNode | false | null | undefined)[] }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <ul className="space-y-1 rounded-sm border border-ochre-gold/40 bg-ochre-gold/5 px-4 py-3 font-body text-xs text-basalt">
      {shown.map((n, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="text-ochre-gold">●</span>
          <span>{n}</span>
        </li>
      ))}
    </ul>
  );
}

export function Unavailable({ message }: { message: string }) {
  return <p className="rounded-sm border border-basalt/10 bg-white p-6 font-body text-sm text-slate">Insights are unavailable right now: {message}</p>;
}
