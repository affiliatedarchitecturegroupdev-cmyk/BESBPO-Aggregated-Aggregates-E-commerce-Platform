"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { latestProject } from "@/app/account/projects/actions";
import { formatZAR } from "@/lib/pricing";

type State = Awaited<ReturnType<typeof latestProject>> | null;

const card = "rounded-sm bg-limestone p-5 text-basalt shadow-sm";
const primary = "inline-block rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt";
const date = (iso: string) => new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

/** The right-hand card of the band: the customer's latest project when signed in, otherwise how to start one. */
export function YourProjectCard() {
  const [state, setState] = useState<State>(null);

  useEffect(() => {
    let live = true;
    latestProject()
      .then((s) => live && setState(s))
      .catch(() => live && setState({ signedIn: false, total: 0, latest: null }));
    return () => {
      live = false;
    };
  }, []);

  if (!state) {
    return (
      <div className={card} aria-busy="true">
        <div className="h-4 w-1/3 animate-pulse rounded-sm bg-basalt/10" />
        <div className="mt-3 h-6 w-2/3 animate-pulse rounded-sm bg-basalt/10" />
        <div className="mt-6 h-16 animate-pulse rounded-sm bg-basalt/10" />
      </div>
    );
  }

  if (!state.signedIn) {
    return (
      <div className={card}>
        <p className="font-mono text-[10px] uppercase text-slate">Your projects</p>
        <p className="mt-1 font-display text-lg font-semibold">Start a project list</p>
        <p className="mt-2 font-body text-sm text-slate">
          Sign in or create an account to save materials by job and stage, and pick up where you left off on any device.
        </p>
        <Link href={`/account/login?next=${encodeURIComponent("/account/projects")}`} className={`mt-4 ${primary}`}>
          Sign in to start
        </Link>
      </div>
    );
  }

  const p = state.latest;
  if (!p) {
    return (
      <div className={card}>
        <p className="font-mono text-[10px] uppercase text-slate">Your projects</p>
        <p className="mt-1 font-display text-lg font-semibold">No projects yet</p>
        <p className="mt-2 font-body text-sm text-slate">Name your first job — a house, a driveway, a boundary wall — and start saving materials to it.</p>
        <Link href="/account/projects" className={`mt-4 ${primary}`}>
          Start your first project
        </Link>
      </div>
    );
  }

  return (
    <div className={card}>
      <p className="font-mono text-[10px] uppercase text-slate">Your latest project · updated {date(p.updatedAt)}</p>
      <p className="mt-1 font-display text-lg font-semibold">{p.name}</p>
      {p.siteName && <p className="font-body text-xs text-slate">{p.siteName}</p>}
      <dl className="mt-4 grid grid-cols-2 gap-3 font-body">
        <div>
          <dt className="text-[11px] text-slate">Estimated materials</dt>
          <dd className="font-display text-xl font-semibold">{p.pricedLines ? formatZAR(p.estimate) : "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate">Saved products</dt>
          <dd className="font-display text-xl font-semibold">{p.items}</dd>
        </div>
      </dl>
      {p.stages.length > 0 && <p className="mt-3 font-body text-xs text-slate">{p.stages.join(" · ")}</p>}
      {(p.quotedLines > 0 || p.missingQuantity > 0) && (
        <p className="mt-2 font-body text-xs text-basalt">
          {[p.missingQuantity > 0 && `${p.missingQuantity} without a quantity yet`, p.quotedLines > 0 && `${p.quotedLines} to be quoted`]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Link href={`/account/projects/${p.id}`} className={primary}>
          Open project
        </Link>
        {state.total > 1 && (
          <Link href="/account/projects" className="font-body text-sm text-seam-blue hover:underline">
            All {state.total} projects
          </Link>
        )}
      </div>
    </div>
  );
}
