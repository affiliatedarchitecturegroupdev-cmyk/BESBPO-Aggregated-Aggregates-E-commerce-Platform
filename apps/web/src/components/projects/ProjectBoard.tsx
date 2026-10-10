"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeProjectItem, updateProjectItem } from "@/app/account/projects/actions";
import { ActionForm, SubmitButton } from "@/components/account/Forms";
import { cart } from "@/lib/cart";
import { formatZAR } from "@/lib/pricing";
import { isWholeUnit, quoteHref, STAGES, summarise, type ProjectItem } from "@/lib/project-lists";

const cell = "rounded-sm border border-basalt/20 bg-white px-2 py-1 font-body text-sm";
const num = (n: number, dp = 1) => n.toLocaleString("en-US", { maximumFractionDigits: dp });

/**
 * A project list laid out like the job: build stages in order, each with
 * its materials, quantities and today's list price; totals for money,
 * tonnage to be delivered and ready-mix volume; and one step to the cart
 * (priced lines) or a quote (everything with a quantity).
 */
export function ProjectBoard({ list, items, editable }: { list: { id?: string; name: string; siteName: string | null }; items: ProjectItem[]; editable: boolean }) {
  const router = useRouter();
  const [added, setAdded] = useState<string | null>(null);
  const s = summarise(items);
  const toCart = s.lines.filter((l) => l.available && l.lineTotal !== null);
  const toQuote = s.lines.filter((l) => l.available && l.item.quantity !== null);

  function addToCart() {
    for (const l of toCart) cart.add({ sku: l.item.sku, unit: l.item.unit, quantity: l.item.quantity! });
    setAdded(`${toCart.length} priced line${toCart.length === 1 ? "" : "s"} added to your cart.`);
    router.push("/cart");
  }

  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-basalt/25 bg-white p-8 text-center font-body text-sm text-slate">
        <p className="font-semibold text-basalt">Nothing saved to this project yet.</p>
        <p className="mt-1">Open any product and use <strong>Save to project</strong> — pick the build stage and, if you know it, the quantity.</p>
        <Link href="/products" className="mt-4 inline-block rounded-sm bg-seam-blue px-4 py-2 font-semibold text-limestone hover:bg-basalt">Browse materials</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-label="Project totals" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Estimated materials", s.pricedLines ? formatZAR(s.estimate) : "—", `${s.pricedLines} priced line${s.pricedLines === 1 ? "" : "s"} at today's list price`],
          ["To be quoted", String(s.quotedLines), s.quotedLines ? "Priced with the supplier on your quote" : "Every saved unit has a price"],
          ["Weight to deliver", s.tonnes ? `${num(s.tonnes, 2)} t` : "—", "Aggregates, bags and steel (approx.)"],
          ["Ready-mix", s.concreteM3 ? `${num(s.concreteM3)} m³` : "—", "Delivered by the plant's mixer truck"],
        ].map(([k, v, note]) => (
          <div key={k} className="rounded-sm border border-basalt/10 bg-white p-4">
            <p className="font-body text-xs text-slate">{k}</p>
            <p className="mt-1 font-display text-2xl font-semibold text-basalt">{v}</p>
            <p className="mt-1 font-body text-[11px] text-slate">{note}</p>
          </div>
        ))}
      </section>
      {s.missingQuantity > 0 && (
        <p className="rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 px-4 py-2 font-body text-xs text-basalt">
          {s.missingQuantity} saved product{s.missingQuantity === 1 ? " has" : "s have"} no quantity yet — add one to include {s.missingQuantity === 1 ? "it" : "them"} in the estimate, cart and quote.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button
          type="button"
          onClick={addToCart}
          disabled={toCart.length === 0}
          className="rounded-sm bg-basalt px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-seam-blue disabled:opacity-40"
        >
          Add {toCart.length} priced line{toCart.length === 1 ? "" : "s"} to cart
        </button>
        <Link
          href={toQuote.length ? quoteHref(list, s.lines) : "#"}
          aria-disabled={toQuote.length === 0}
          className={`rounded-sm border border-seam-blue px-4 py-2 font-body text-sm font-semibold text-seam-blue hover:bg-seam-blue/5 ${toQuote.length ? "" : "pointer-events-none opacity-40"}`}
        >
          Request a quote for the list{toQuote.length > 30 ? " (first 30 lines)" : ""}
        </Link>
        <button type="button" onClick={() => window.print()} className="font-body text-sm text-slate hover:text-basalt">
          Print / save as PDF
        </button>
        {added && <span role="status" className="font-body text-xs text-seam-blue">{added}</span>}
      </div>

      {STAGES.map((stage) => {
        const lines = s.lines.filter((l) => l.item.stage === stage.value);
        if (lines.length === 0) return null;
        const subtotal = lines.reduce((t, l) => t + (l.lineTotal ?? 0), 0);
        return (
          <section key={stage.value} className="break-inside-avoid rounded-sm border border-basalt/10 bg-white">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-basalt/10 px-4 py-3">
              <div>
                <h2 className="font-display text-base font-semibold text-basalt">{stage.label}</h2>
                <p className="font-body text-[11px] text-slate">{stage.hint}</p>
              </div>
              <p className="font-body text-sm text-basalt">{subtotal ? formatZAR(subtotal) : ""}</p>
            </header>
            <ul className="divide-y divide-basalt/5">
              {lines.map((l) => (
                <li key={l.item.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {l.slug ? (
                        <Link href={`/products/${l.slug}`} className="font-body text-sm font-semibold text-basalt hover:text-seam-blue">{l.name}</Link>
                      ) : (
                        <span className="font-body text-sm font-semibold text-basalt">{l.name}</span>
                      )}
                      <p className="font-mono text-[11px] text-slate">
                        {l.item.quantity !== null ? `${num(l.item.quantity, 3)} × ${l.unitLabel}` : `No quantity yet · ${l.unitLabel}`}
                        {l.massKg ? ` · ≈ ${num(l.massKg / 1000, 2)} t` : ""}
                        {l.item.note ? ` · ${l.item.note}` : ""}
                      </p>
                      {!l.available && <p className="font-body text-xs text-red-800">No longer sold in this unit — choose another or remove it.</p>}
                    </div>
                    <p className="text-right font-body text-sm text-basalt">
                      {l.lineTotal !== null ? (
                        <>
                          <strong>{formatZAR(l.lineTotal)}</strong>
                          <span className="block text-[11px] text-slate">{formatZAR(l.unitPrice!)} / {l.unitLabel}</span>
                        </>
                      ) : l.unitPrice !== null ? (
                        <span className="text-xs text-slate">{formatZAR(l.unitPrice)} / {l.unitLabel}</span>
                      ) : (
                        <span className="rounded-sm bg-ochre-gold/15 px-2 py-0.5 text-xs text-basalt">Quoted</span>
                      )}
                    </p>
                  </div>
                  {editable && list.id && (
                    <div className="mt-2 flex flex-wrap items-end gap-2 print:hidden">
                      <ActionForm action={updateProjectItem} className="flex flex-wrap items-end gap-2">
                        <input type="hidden" name="listId" value={list.id} />
                        <input type="hidden" name="itemId" value={l.item.id} />
                        <input
                          aria-label={`Quantity of ${l.name}`}
                          name="quantity"
                          type="number"
                          min={0}
                          step={isWholeUnit(l.item.unit) ? 1 : 0.1}
                          defaultValue={l.item.quantity ?? ""}
                          placeholder="Qty"
                          className={`${cell} w-24`}
                        />
                        <select aria-label={`Unit for ${l.name}`} name="unit" defaultValue={l.item.unit} className={cell}>
                          {l.units.map((u) => (
                            <option key={u.code} value={u.code}>{u.label}</option>
                          ))}
                        </select>
                        <select aria-label={`Stage for ${l.name}`} name="stage" defaultValue={l.item.stage} className={cell}>
                          {STAGES.map((st) => (
                            <option key={st.value} value={st.value}>{st.label}</option>
                          ))}
                        </select>
                        <input aria-label={`Note for ${l.name}`} name="note" defaultValue={l.item.note ?? ""} maxLength={200} placeholder="Note" className={`${cell} w-40`} />
                        <SubmitButton variant="subtle">Update</SubmitButton>
                      </ActionForm>
                      <form action={removeProjectItem}>
                        <input type="hidden" name="listId" value={list.id} />
                        <input type="hidden" name="itemId" value={l.item.id} />
                        <button type="submit" className="rounded-sm px-2 py-2 font-body text-xs text-slate hover:bg-limestone hover:text-red-800">Remove</button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <p className="font-body text-[11px] text-slate">
        Estimates use today&apos;s retail list prices; your tier price, delivery and anything quoted are confirmed at checkout or on your quote. Weights are approximate
        (bulk density and nominal masses).
      </p>
    </div>
  );
}
