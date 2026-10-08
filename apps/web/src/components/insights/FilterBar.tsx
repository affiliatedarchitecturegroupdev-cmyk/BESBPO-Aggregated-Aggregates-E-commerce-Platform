"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Option = { value: string; label: string };
export type FilterControl = { key: string; label: string; options: Option[] };

const selectClass = "rounded-sm border border-basalt/20 bg-white px-2 py-1.5 font-body text-sm text-basalt";

/**
 * The one filter row above every Insights view. Changing a control updates the
 * page's query string, so every chart, figure, tab link and CSV download on
 * the page shows the same slice. Editing a date switches the range to custom.
 */
export function FilterBar({ ranges, controls, from, to }: { ranges: Option[]; controls: FilterControl[]; from: string; to: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const range = params.get("range") ?? (params.get("from") || params.get("to") ? "custom" : "30d");

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (next.get("range") !== "custom") {
      next.delete("from");
      next.delete("to");
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-sm border border-basalt/10 bg-white p-3"
      aria-label="Insights filters"
      aria-busy={pending}
      onSubmit={(e) => e.preventDefault()}
    >
      <label className="font-body text-xs text-slate">
        Period
        <select className={`${selectClass} mt-1 block`} value={range} onChange={(e) => update(e.target.value === "custom" ? { range: "custom", from, to } : { range: e.target.value })}>
          {ranges.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <label className="font-body text-xs text-slate">
        From
        <input type="date" className={`${selectClass} mt-1 block`} value={from} max={to} onChange={(e) => e.target.value && update({ range: "custom", from: e.target.value, to })} />
      </label>
      <label className="font-body text-xs text-slate">
        To
        <input type="date" className={`${selectClass} mt-1 block`} value={to} min={from} onChange={(e) => e.target.value && update({ range: "custom", from, to: e.target.value })} />
      </label>
      {controls.map((c) => (
        <label key={c.key} className="font-body text-xs text-slate">
          {c.label}
          <select className={`${selectClass} mt-1 block max-w-[12rem]`} value={params.get(c.key) ?? ""} onChange={(e) => update({ [c.key]: e.target.value })}>
            {c.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      <button
        type="button"
        className="rounded-sm px-2 py-1.5 font-body text-xs text-seam-blue underline-offset-2 hover:underline"
        onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}
      >
        Reset
      </button>
      <span role="status" className="font-body text-xs text-slate">
        {pending ? "Updating…" : ""}
      </span>
    </form>
  );
}
