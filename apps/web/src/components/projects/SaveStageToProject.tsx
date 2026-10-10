"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";
import { myProjectLists, saveStageToProject } from "@/app/account/projects/actions";
import { inputClass, SubmitButton } from "@/components/account/Forms";

const label = "font-mono text-[10px] uppercase text-slate";

/** Save every pick in a build stage to a project list in one go (quantities are added on the list). */
export function SaveStageToProject({ stage, stageLabel, lines }: { stage: string; stageLabel: string; lines: { sku: string; unit: string }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof myProjectLists>> | null>(null);
  const [listId, setListId] = useState("");
  const [state, action] = useFormState(saveStageToProject, null);
  const saved = state && "listId" in state && state.listId && !state.error ? state.listId : null;

  useEffect(() => {
    if (!open || data) return;
    void myProjectLists().then((d) => {
      setData(d);
      setListId(d.lists[0]?.id ?? "new");
    });
  }, [open, data]);

  // A different stage is a different save.
  useEffect(() => setOpen(false), [stage]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt"
      >
        Save this stage to a project
      </button>
      {open && (
        <div role="dialog" aria-label={`Save ${stageLabel} to a project`} className="absolute left-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-sm border border-basalt/15 bg-white p-4 shadow-lg">
          {!data ? (
            <p className="font-body text-sm text-slate">Loading your projects…</p>
          ) : !data.signedIn ? (
            <div className="font-body text-sm text-basalt">
              <p className="font-semibold">Plan the job in a project list</p>
              <p className="mt-1 text-slate">Save these {lines.length} materials under {stageLabel}, add quantities as the drawings firm up, then order or quote the lot.</p>
              <Link href={`/account/login?next=${encodeURIComponent(pathname)}`} className="mt-3 inline-block rounded-sm bg-seam-blue px-4 py-2 font-semibold text-limestone hover:bg-basalt">
                Sign in to save
              </Link>
            </div>
          ) : (
            <form action={action} className="space-y-3">
              <input type="hidden" name="stage" value={stage} />
              <input type="hidden" name="lines" value={lines.map((l) => `${l.sku}~${l.unit}`).join(",")} />
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
                  <input name="newName" required minLength={2} maxLength={80} placeholder="e.g. House 14" className={inputClass} />
                </label>
              )}
              <p className="font-body text-xs text-slate">
                Adds {lines.length} materials under <strong>{stageLabel}</strong>. Anything already on the list keeps its quantity.
              </p>
              {state?.error && <p role="alert" className="font-body text-xs text-red-800">{state.error}</p>}
              {saved && (
                <p role="status" className="font-body text-xs text-seam-blue">
                  {state?.success}{" "}
                  <Link href={`/account/projects/${saved}`} className="font-semibold underline">Open the list</Link>
                </p>
              )}
              <SubmitButton>Save</SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
