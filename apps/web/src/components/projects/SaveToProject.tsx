"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { myProjectLists, saveToProject } from "@/app/account/projects/actions";
import { inputClass, SubmitButton } from "@/components/account/Forms";
import { findQuotable } from "@/data/quotable";
import { defaultStage, isWholeUnit, STAGES } from "@/lib/project-lists";

const label = "font-mono text-[10px] uppercase text-slate";

/**
 * "Save to project": the construction take on a wishlist. Saves the product
 * (and, optionally, a quantity) to one of the customer's project lists, under
 * the build stage it belongs to — or starts a new list for the job.
 */
export function SaveToProject({ sku }: { sku: string }) {
  const product = findQuotable(sku);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof myProjectLists>> | null>(null);
  const [listId, setListId] = useState("");
  const [unit, setUnit] = useState(product?.units[0]?.code ?? "");
  const [state, action] = useFormState(saveToProject, null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || data) return;
    void myProjectLists().then((d) => {
      setData(d);
      setListId(d.lists[0]?.id ?? "new");
    });
  }, [open, data]);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    panel.current?.querySelector<HTMLElement>("select, input")?.focus();
    return () => window.removeEventListener("keydown", close);
  }, [open, data]);

  const saved = state && "listId" in state && state.listId && !state.error ? state.listId : null;
  // After saving (perhaps to a new list), refresh the list names and counts.
  useEffect(() => {
    if (!saved) return;
    void myProjectLists().then((d) => {
      setData(d);
      setListId(saved);
    });
  }, [saved, state]);

  if (!product) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-sm border border-basalt/20 bg-white px-3 py-1.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6" />
        </svg>
        Save to project
      </button>
      {open && (
        <div ref={panel} role="dialog" aria-label="Save to a project list" className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-sm border border-basalt/15 bg-white p-4 shadow-lg">
          {!data ? (
            <p className="font-body text-sm text-slate">Loading your projects…</p>
          ) : !data.signedIn ? (
            <div className="font-body text-sm text-basalt">
              <p className="font-semibold">Plan your job in project lists</p>
              <p className="mt-1 text-slate">Save materials by build stage — foundations, slab, walls — with quantities, then send the whole list to your cart or for a quote.</p>
              <Link href={`/account/login?next=${encodeURIComponent(pathname)}`} className="mt-3 inline-block rounded-sm bg-seam-blue px-4 py-2 font-semibold text-limestone hover:bg-basalt">
                Sign in to save
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-3">
              <input type="hidden" name="sku" value={sku} />
              <label className="block">
                <span className={label}>Project</span>
                <select name="listId" value={listId} onChange={(e) => setListId(e.target.value)} className={inputClass}>
                  {data.lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.count})
                    </option>
                  ))}
                  <option value="new">+ New project…</option>
                </select>
              </label>
              {listId === "new" && (
                <label className="block">
                  <span className={label}>New project name</span>
                  <input name="newName" required minLength={2} maxLength={80} placeholder="e.g. House 14 — foundations" className={inputClass} />
                </label>
              )}
              <label className="block">
                <span className={label}>Build stage</span>
                <select name="stage" defaultValue={defaultStage(product.categorySlug)} className={inputClass}>
                  {STAGES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className={label}>Quantity (optional)</span>
                  <input name="quantity" type="number" min={0} step={isWholeUnit(unit) ? 1 : 0.1} inputMode="decimal" className={inputClass} />
                </label>
                <label className="block">
                  <span className={label}>Unit</span>
                  <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className={inputClass}>
                    {product.units.map((u) => (
                      <option key={u.code} value={u.code}>{u.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className={label}>Note (optional)</span>
                <input name="note" maxLength={200} placeholder="e.g. raft and ground beams" className={inputClass} />
              </label>
              {state?.error && <p role="alert" className="font-body text-xs text-red-800">{state.error}</p>}
              {saved && (
                <p role="status" className="font-body text-xs text-seam-blue">
                  {state?.success}{" "}
                  <Link href={`/account/projects/${saved}`} className="font-semibold underline">Open the list</Link>
                </p>
              )}
              <div className="flex items-center justify-between gap-3">
                <SubmitButton>Save</SubmitButton>
                <Link href="/account/projects" className="font-body text-xs text-slate hover:text-basalt">All projects</Link>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
