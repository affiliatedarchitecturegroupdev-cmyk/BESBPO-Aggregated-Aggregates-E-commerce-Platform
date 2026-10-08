"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { deleteView, saveView } from "@/app/admin/insights/actions";
import { FormMessage, SubmitButton, inputClass } from "@/components/account/Forms";

export type SavedView = { id: string; name: string; href: string; shared: boolean; mine: boolean; owner: string };

/**
 * Saved Insights views: open one (it carries its tab and filters), save the
 * current tab and filters under a name — privately or for all staff — and
 * delete your own (admins can also remove shared ones).
 */
export function SavedViews({ views, isAdmin }: { views: SavedView[]; isAdmin: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [state, action] = useFormState(saveView, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const path = pathname.replace(/^\/admin\/insights\/?/, "").split("/")[0] ?? "";
  useEffect(() => {
    if (state && "success" in state && state.success) formRef.current?.reset();
  }, [state]);
  const mine = views.filter((v) => v.mine);
  const shared = views.filter((v) => !v.mine);

  return (
    <div className="flex flex-wrap items-center gap-2 font-body text-xs">
      <span className="text-slate">Saved views:</span>
      {views.length === 0 && <span className="text-slate">none yet</span>}
      {[...mine, ...shared].map((v) => (
        <span key={v.id} className="inline-flex items-center rounded-sm border border-basalt/15 bg-white">
          <Link href={v.href} className="px-2 py-1 text-basalt hover:text-seam-blue" title={v.mine ? (v.shared ? "Yours, shared with staff" : "Only you can see this") : `Shared by ${v.owner}`}>
            {v.name}
            {v.shared && <span className="ml-1 text-slate">· shared</span>}
          </Link>
          {(v.mine || isAdmin) && (
            <form action={deleteView}>
              <input type="hidden" name="id" value={v.id} />
              <button type="submit" className="border-l border-basalt/10 px-1.5 py-1 text-slate hover:text-red-700" aria-label={`Delete saved view ${v.name}`}>
                ×
              </button>
            </form>
          )}
        </span>
      ))}
      {path !== "email" && <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="rounded-sm px-2 py-1 text-seam-blue hover:underline">
        {open ? "Cancel" : "+ Save this view"}
      </button>}
      {open && path !== "email" && (
        <form ref={formRef} action={action} className="flex w-full flex-wrap items-end gap-3 rounded-sm border border-basalt/10 bg-white p-3">
          <input type="hidden" name="path" value={path} />
          <input type="hidden" name="query" value={params.toString()} />
          <label className="min-w-[14rem] flex-1">
            <span className="font-mono text-[10px] uppercase text-slate">Name</span>
            <input name="name" required minLength={2} maxLength={80} placeholder="e.g. KZN contractors, last 90 days" className={inputClass} />
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm text-basalt">
            <input type="checkbox" name="shared" /> Share with all staff
          </label>
          <SubmitButton>Save view</SubmitButton>
          <div className="w-full">
            <FormMessage state={state} />
          </div>
        </form>
      )}
    </div>
  );
}
