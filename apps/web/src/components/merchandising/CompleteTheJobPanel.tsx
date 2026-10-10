"use client";

import Link from "next/link";
import { useState } from "react";
import { MaterialSwatch } from "@/components/product/MaterialSwatch";
import { SaveStageToProject } from "@/components/projects/SaveStageToProject";
import type { CompleteTheJobView } from "@/data/complete-the-job";
import { isWholeUnit } from "@/data/quotable";
import { cart } from "@/lib/cart";
import { formatZAR } from "@/lib/pricing";

/**
 * The companions as a short checklist: tick what you need, set the
 * quantity and add the priced lines to the cart in one go. Lines without a
 * list price are priced on a quote, so they link to their page instead.
 */
export function CompleteTheJobPanel({ job }: { job: CompleteTheJobView }) {
  const priced = job.companions.filter((c) => c.price !== null);
  const [picked, setPicked] = useState<Record<string, boolean>>(() => Object.fromEntries(priced.map((c) => [c.sku, c.preselected])));
  const [qty, setQty] = useState<Record<string, string>>(() => Object.fromEntries(priced.map((c) => [c.sku, String(c.quantity)])));
  const [added, setAdded] = useState<string | null>(null);

  const chosen = priced.filter((c) => picked[c.sku] && Number(qty[c.sku]) > 0);
  const total = chosen.reduce((t, c) => t + c.price! * Number(qty[c.sku]), 0);

  function addToCart() {
    for (const c of chosen) cart.add({ sku: c.sku, unit: c.unit, quantity: Number(qty[c.sku]) });
    setAdded(`${chosen.length} item${chosen.length === 1 ? "" : "s"} added to your cart.`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-seam-blue">Complete the job · {job.stageLabel}</p>
          <h2 id="complete-the-job" className="mt-1 font-display text-xl font-bold text-basalt">
            {job.title}
          </h2>
        </div>
        <Link href={`/shop-by-stage?stage=${job.stage}`} className="font-body text-sm text-seam-blue hover:underline">
          Everything for {job.stageLabel.toLowerCase()} →
        </Link>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {job.companions.map((c) => {
          const isPriced = c.price !== null;
          return (
            <li key={c.sku} className="flex overflow-hidden rounded-sm border border-basalt/10 bg-white">
              <MaterialSwatch sku={c.sku} categorySlug={c.categorySlug} className="w-14 shrink-0 rounded-none" grains={24} />
              <div className="flex min-w-0 flex-1 flex-col p-3">
                <p className="font-body text-xs text-slate">{c.why}</p>
                <Link href={`/products/${c.slug}`} className="mt-0.5 font-body text-sm font-semibold text-basalt hover:text-seam-blue">
                  {c.name}
                </Link>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                  <p className="font-body text-xs text-slate">
                    {isPriced ? (
                      <>
                        <strong className="text-basalt">{formatZAR(c.price!)}</strong> / {c.unitLabel}
                      </>
                    ) : (
                      <>Price on quote · {c.unitLabel}</>
                    )}
                  </p>
                  {isPriced ? (
                    <div className="flex items-center gap-2">
                      <input
                        aria-label={`Quantity of ${c.name} (${c.unitLabel})`}
                        type="number"
                        min={0}
                        step={isWholeUnit(c.unit) ? 1 : 0.5}
                        value={qty[c.sku]}
                        onChange={(e) => setQty((q) => ({ ...q, [c.sku]: e.target.value }))}
                        className="w-16 rounded-sm border border-basalt/20 px-2 py-1 font-body text-sm"
                      />
                      <input
                        aria-label={`Add ${c.name}`}
                        type="checkbox"
                        checked={!!picked[c.sku]}
                        onChange={(e) => setPicked((p) => ({ ...p, [c.sku]: e.target.checked }))}
                        className="h-4 w-4 accent-seam-blue"
                      />
                    </div>
                  ) : (
                    <Link href={`/products/${c.slug}`} className="font-body text-xs font-semibold text-seam-blue hover:underline">
                      Quote
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {priced.length > 0 && (
          <button
            type="button"
            onClick={addToCart}
            disabled={chosen.length === 0}
            className="rounded-sm bg-basalt px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-seam-blue disabled:opacity-40"
          >
            Add {chosen.length} to cart{chosen.length ? ` · ${formatZAR(total)}` : ""}
          </button>
        )}
        <SaveStageToProject
          stage={job.stage}
          stageLabel={job.stageLabel}
          lines={job.companions.map((c) => ({ sku: c.sku, unit: c.unit }))}
          buttonLabel="Save these to a project"
          variant="outline"
        />
        {added ? (
          <p role="status" className="font-body text-xs text-seam-blue">
            {added}{" "}
            <Link href="/cart" className="font-semibold underline">
              View cart
            </Link>
          </p>
        ) : (
          <p className="font-body text-[11px] text-slate">
            Quantities start at one unit (a full truck for ready-mix) — size them with the calculators, or change them in the cart.
          </p>
        )}
      </div>
    </div>
  );
}
