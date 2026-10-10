"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MaterialSwatch } from "@/components/product/MaterialSwatch";
import { SaveStageToProject } from "@/components/projects/SaveStageToProject";
import type { StageView } from "@/data/build-stages";
import { formatZAR } from "@/lib/pricing";

const chip = "rounded-sm border border-basalt/15 bg-white px-2.5 py-1 font-body text-xs text-basalt hover:border-seam-blue hover:text-seam-blue";

/** The build-stage tabs and, for the chosen stage, its picks, categories, hire and tools. */
export function StageShop({ stages, initialStage }: { stages: StageView[]; initialStage?: string }) {
  const [index, setIndex] = useState(() => Math.max(0, stages.findIndex((s) => s.stage === initialStage)));
  const tabs = useRef<HTMLDivElement>(null);
  const s = stages[index];
  // On narrow screens the tabs scroll sideways; keep the chosen one in view.
  const chosen = useRef(false);
  useEffect(() => {
    if (!chosen.current) return;
    tabs.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);
  const choose = (i: number) => {
    chosen.current = true;
    setIndex(i);
  };
  return (
    <div>
      <div ref={tabs} role="tablist" aria-label="Build stages" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {stages.map((stage, i) => (
          <button
            key={stage.stage}
            type="button"
            role="tab"
            id={`stage-tab-${stage.stage}`}
            aria-selected={i === index}
            aria-controls="stage-panel"
            onClick={() => choose(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") choose((index + 1) % stages.length);
              if (e.key === "ArrowLeft") choose((index - 1 + stages.length) % stages.length);
            }}
            className={`shrink-0 rounded-sm px-3 py-1.5 font-body text-sm ${i === index ? "bg-basalt text-limestone" : "border border-basalt/20 bg-white text-basalt hover:border-seam-blue"}`}
          >
            <span className="mr-1.5 font-mono text-[10px] opacity-60">{i + 1}</span>
            {stage.label}
          </button>
        ))}
      </div>

      <div id="stage-panel" role="tabpanel" aria-labelledby={`stage-tab-${s.stage}`} className="mt-6 grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        <div className="min-w-0 space-y-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Stage {index + 1} of {stages.length}</p>
            <h3 className="mt-1 font-display text-xl font-bold text-basalt">{s.label}</h3>
            <p className="mt-2 font-body text-sm text-slate">{s.intro}</p>
          </div>
          <SaveStageToProject stage={s.stage} stageLabel={s.label} lines={s.picks.map((p) => ({ sku: p.sku, unit: p.unit }))} />
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {s.tools.map((t) => (
              <Link key={t.href} href={t.href} className="font-body text-sm font-semibold text-seam-blue hover:underline">{t.label} →</Link>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {s.picks.map((p) => (
              <li key={p.sku}>
                <Link href={`/products/${p.slug}`} className="group flex h-full overflow-hidden rounded-sm border border-basalt/10 bg-white transition hover:border-seam-blue hover:shadow-sm">
                  <MaterialSwatch sku={p.sku} categorySlug={p.categorySlug} className="w-16 shrink-0 rounded-none" grains={30} />
                  <div className="flex min-w-0 flex-1 flex-col p-3">
                    <p className="font-mono text-[10px] uppercase tracking-wide text-seam-blue">{p.role}</p>
                    <p className="mt-0.5 font-body text-sm font-semibold text-basalt group-hover:text-seam-blue">{p.name}</p>
                    <p className="mt-auto pt-2 font-body text-xs text-slate">
                      {p.price !== null ? (
                        <>
                          <strong className="text-basalt">{formatZAR(p.price)}</strong> / {p.unitLabel}
                        </>
                      ) : (
                        <>Price on quote · {p.unitLabel}</>
                      )}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[10px] uppercase text-slate">Browse</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {s.categories.map((c) => (
                  <Link key={c.href} href={c.href} className={chip}>{c.label}</Link>
                ))}
              </div>
            </div>
            {s.hire.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase text-slate">Hire &amp; services for this stage</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {s.hire.map((h) => (
                    <Link key={h.href} href={h.href} className={chip}>{h.label}</Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
