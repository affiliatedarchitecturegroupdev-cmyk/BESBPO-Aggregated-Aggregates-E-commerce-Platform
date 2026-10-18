"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { parseBoq, submitBoq, type BoqItem } from "@/app/quote/boq/actions";
import { inputClass } from "@/components/account/Forms";
import { findQuotable } from "@/data/quotable";

const NONE = "";
type Choice = { include: boolean; sku: string; unit: string; quantity: string };

/**
 * Bill of quantities upload (docs/boq-upload.md): upload an Excel or CSV
 * BOQ, check the product we suggest for each line (or leave it for our team
 * to quote as written), then send it all as one quote request.
 */
export function BoqUpload({ signedIn, email, name }: { signedIn: boolean; email?: string; name?: string | null }) {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<BoqItem[] | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const read = () => {
    if (!file) return;
    setError(null);
    const form = new FormData();
    form.set("file", file);
    start(async () => {
      const result = await parseBoq(form);
      if (!result.ok) return setError(result.error);
      setItems(result.items);
      setChoices(
        result.items.map((item) => {
          const best = item.matches[0];
          const product = best ? findQuotable(best.sku) : undefined;
          const unit = product?.units.some((u) => u.code === best!.unit) ? best!.unit : (product?.units[0]?.code ?? "");
          return { include: true, sku: product ? best!.sku : NONE, unit, quantity: String(item.quantity) };
        }),
      );
    });
  };

  const set = (i: number, patch: Partial<Choice>) => setChoices(choices.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const send = (form: FormData) => {
    if (!file || !items) return;
    const lines = choices.flatMap((c) => (c.include && c.sku && Number(c.quantity) > 0 ? [{ sku: c.sku, unit: c.unit, quantity: Number(c.quantity) }] : []));
    const unmatched = items.flatMap((item, i) => (choices[i].include && !choices[i].sku ? [{ description: item.description, quantity: Number(choices[i].quantity) || item.quantity, unit: item.unit }] : []));
    if (lines.length === 0) return setError("Match at least one line to a product — anything else is sent for our team to quote as written.");
    if (lines.length > 30) return setError("Up to 30 matched lines per request — split a longer bill of quantities into two requests.");
    const text = (k: string) => String(form.get(k) ?? "").trim();
    const payload = {
      contactName: text("contactName"),
      contactEmail: text("contactEmail"),
      contactPhone: text("contactPhone") || undefined,
      companyName: text("companyName") || undefined,
      projectName: text("projectName") || undefined,
      deliveryAddress: text("deliveryAddress"),
      deliveryProvince: text("deliveryProvince") || undefined,
      notes: text("notes") || undefined,
      lines,
      unmatched,
    };
    const upload = new FormData();
    upload.set("file", file);
    upload.set("payload", JSON.stringify(payload));
    setError(null);
    start(async () => {
      const result = await submitBoq(upload);
      if (!result.ok) return setError(result.error);
      setDone(result.reference);
    });
  };

  if (done) {
    return (
      <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5 font-body text-sm text-seam-blue">
        <p className="font-semibold">Quote request {done} sent — thank you.</p>
        <p className="mt-1">Our sales team replies within one business day with delivered pricing. Your bill of quantities is attached for them.</p>
        {signedIn && <Link href="/account/dashboard" className="mt-2 inline-block text-seam-blue underline">See it in your account</Link>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-sm border border-red-700/30 bg-red-50 p-3 font-body text-sm text-red-800">{error}</p>}
      <section className="rounded-sm border border-basalt/10 bg-white p-5">
        <h2 className="font-body text-sm font-semibold text-basalt">1. Upload your bill of quantities</h2>
        <p className="mt-1 font-body text-xs text-slate">Excel (.xlsx) or CSV, up to 5 MB. We read the first sheet: columns headed Description, Qty and Unit work best.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setItems(null); }} className="font-body text-sm" />
          <button type="button" onClick={read} disabled={!file || pending} className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50">
            {pending && !items ? "Reading…" : "Read it"}
          </button>
        </div>
      </section>

      {items && (
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">2. Check each line ({items.length})</h2>
          <p className="mt-1 font-body text-xs text-slate">
            We&apos;ve suggested the closest product in our catalogue — check it, and the unit. Lines left as &ldquo;quote as written&rdquo; go to our team
            exactly as your BOQ describes them.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[46rem] text-left font-body text-xs">
              <thead className="text-slate"><tr><th className="py-1 pr-2 font-normal">Include</th><th className="py-1 pr-2 font-normal">Your BOQ says</th><th className="py-1 pr-2 font-normal">Product</th><th className="py-1 pr-2 font-normal">Unit</th><th className="py-1 font-normal">Qty</th></tr></thead>
              <tbody className="divide-y divide-basalt/5">
                {items.map((item, i) => {
                  const c = choices[i];
                  const product = c.sku ? findQuotable(c.sku) : undefined;
                  return (
                    <tr key={item.row} className="align-top">
                      <td className="py-1.5 pr-2"><input type="checkbox" checked={c.include} onChange={(e) => set(i, { include: e.target.checked })} aria-label={`Include row ${item.row}`} /></td>
                      <td className="py-1.5 pr-2">{item.description}<span className="block text-slate">{item.quantity} {item.unit ?? ""} · row {item.row}</span></td>
                      <td className="py-1.5 pr-2">
                        <select
                          value={c.sku}
                          onChange={(e) => { const p = findQuotable(e.target.value); set(i, { sku: e.target.value, unit: p?.units[0]?.code ?? "" }); }}
                          className={`${inputClass} mt-0`}
                        >
                          <option value={NONE}>Quote as written</option>
                          {item.matches.filter((m) => findQuotable(m.sku)).map((m) => <option key={m.sku} value={m.sku}>{m.name}</option>)}
                        </select>
                        {c.sku && item.matches.find((m) => m.sku === c.sku)?.unitGuessed && <span className="text-ochre-gold">Check the unit</span>}
                      </td>
                      <td className="py-1.5 pr-2">
                        {product ? (
                          <select value={c.unit} onChange={(e) => set(i, { unit: e.target.value })} className={`${inputClass} mt-0`}>
                            {product.units.map((u) => <option key={u.code} value={u.code}>{u.label}</option>)}
                          </select>
                        ) : <span className="text-slate">—</span>}
                      </td>
                      <td className="py-1.5"><input type="number" min={0} step="any" value={c.quantity} onChange={(e) => set(i, { quantity: e.target.value })} className={`${inputClass} mt-0 w-24`} aria-label={`Quantity row ${item.row}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {items && (
        <section className="rounded-sm border border-basalt/10 bg-white p-5">
          <h2 className="font-body text-sm font-semibold text-basalt">3. Where it&apos;s going and who to reply to</h2>
          <form action={send} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Your name *</span><input name="contactName" required minLength={2} defaultValue={name ?? ""} className={inputClass} /></label>
            <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Email *</span><input name="contactEmail" type="email" required defaultValue={email ?? ""} className={inputClass} /></label>
            <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Phone</span><input name="contactPhone" type="tel" className={inputClass} /></label>
            <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Company</span><input name="companyName" className={inputClass} /></label>
            <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Project</span><input name="projectName" className={inputClass} /></label>
            <label className="block"><span className="font-mono text-[10px] uppercase text-slate">Province</span><input name="deliveryProvince" className={inputClass} /></label>
            <label className="block sm:col-span-2"><span className="font-mono text-[10px] uppercase text-slate">Delivery address *</span><input name="deliveryAddress" required minLength={3} className={inputClass} /></label>
            <label className="block sm:col-span-2"><span className="font-mono text-[10px] uppercase text-slate">Anything else (phasing, access, deadlines)</span><textarea name="notes" rows={2} maxLength={2000} className={inputClass} /></label>
            <p className="font-body text-[11px] text-slate sm:col-span-2">
              We use these details to quote and deliver — see our <Link href="/legal/privacy-policy" className="text-seam-blue hover:underline">privacy policy</Link>. Your file is kept with the quote request for our sales team.
            </p>
            <div className="sm:col-span-2">
              <button disabled={pending} className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50">{pending ? "Sending…" : "Send for a quote"}</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
