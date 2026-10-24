"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { priceQuotation, saveQuotation, searchQuoteProducts } from "@/app/admin/quotations/actions";
import { inputClass } from "@/components/account/Forms";
import { formatZAR } from "@/lib/pricing";
import type { PriceMode, PricedQuotation, QuotationInput, QuoteUnit, SalesQuotation } from "@/lib/quotations";
import { PROVINCES } from "@/lib/suppliers";

type Line = { key: string; sku: string; name: string; units: QuoteUnit[]; unit: string; quantity: string; mode: PriceMode; unitCost: string; markupPercent: string; unitPrice: string; note: string };

const MODE_FROM_SOURCE = { LIST: "LIST", SUPPLIER_COST: "COST", MANUAL: "PRICE" } as const;
const TIERS = [
  { value: "RETAIL", label: "Retail" },
  { value: "CONTRACTOR_TRADE", label: "Contractor / trade" },
  { value: "VOLUME_CIVIL_BULK", label: "Volume / civil bulk" },
] as const;
const num = (v: string) => (v.trim() === "" ? null : Number(v));
let keySeq = 0;

/**
 * The sales quotation editor (docs/sales-quotes.md): the client, the lines —
 * any product, at its list price, a supplier's cost plus markup, or a typed
 * price — delivery, validity and notes, priced live with the margin (staff only).
 */
export function QuotationEditor({ quote, readOnly = false }: { quote?: SalesQuotation; readOnly?: boolean }) {
  const router = useRouter();
  const [client, setClient] = useState({
    name: quote?.client.name ?? "",
    companyName: quote?.client.companyName ?? "",
    email: quote?.client.email ?? "",
    phone: quote?.client.phone ?? "",
    address: quote?.client.address ?? "",
    province: quote?.client.province ?? "",
    vatNumber: quote?.client.vatNumber ?? "",
  });
  const [tier, setTier] = useState<QuotationInput["tier"]>(quote?.tier ?? "RETAIL");
  const [distance, setDistance] = useState(quote?.deliveryDistanceKm != null ? String(quote.deliveryDistanceKm) : "");
  const [deliveryFee, setDeliveryFee] = useState(quote ? String(quote.deliveryFee) : "");
  const [validDays, setValidDays] = useState("14");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [staffNotes, setStaffNotes] = useState(quote?.staffNotes ?? "");
  const [lines, setLines] = useState<Line[]>(
    () =>
      quote?.lines.map((l) => ({
        key: `l${keySeq++}`,
        sku: l.sku,
        name: l.name,
        units: l.units,
        unit: l.unit,
        quantity: String(l.quantity),
        mode: l.priceSource ? MODE_FROM_SOURCE[l.priceSource] : "LIST",
        unitCost: l.unitCost != null && l.priceSource === "SUPPLIER_COST" ? String(l.unitCost) : "",
        markupPercent: l.markupPercent != null && l.priceSource === "SUPPLIER_COST" ? String(l.markupPercent) : "",
        unitPrice: l.priceSource === "MANUAL" ? String(l.unitPrice) : "",
        note: l.note ?? "",
      })) ?? [],
  );
  const [pricing, setPricing] = useState<PricedQuotation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const payloadLines = lines
    .filter((l) => Number(l.quantity) > 0)
    .map((l) => ({
      sku: l.sku,
      unit: l.unit,
      quantity: Number(l.quantity),
      ...(l.mode === "COST" && num(l.unitCost) !== null ? { unitCost: num(l.unitCost), markupPercent: num(l.markupPercent) } : {}),
      ...(l.mode === "PRICE" && num(l.unitPrice) !== null ? { unitPrice: num(l.unitPrice) } : {}),
      ...(l.note.trim() ? { note: l.note.trim() } : {}),
    }));
  const pricingKey = JSON.stringify({ payloadLines, tier, distance, province: client.province });

  // Live pricing, a moment after the last change.
  useEffect(() => {
    if (payloadLines.length === 0) return setPricing(null);
    const timer = setTimeout(async () => {
      const result = await priceQuotation({ tier, deliveryDistanceKm: num(distance), deliveryFee: null, lines: payloadLines, province: client.province });
      if (result.ok) {
        setPricing(result.pricing);
        setError(null);
        // A product with no list price needs a supplier cost or a price.
        setLines((current) =>
          current.map((l, i) => (l.mode === "LIST" && result.pricing.lines[i] && result.pricing.lines[i].listUnitPrice === null ? { ...l, mode: "COST" } : l)),
        );
      } else setError(result.error);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-price when the lines, tier or distance change
  }, [pricingKey]);

  const fee = num(deliveryFee) ?? pricing?.suggestedDelivery?.total ?? null;
  const priced = pricing?.lines ?? [];
  const subtotal = priced.every((l) => l.lineTotal !== null) ? priced.reduce((t, l) => t + (l.lineTotal ?? 0), 0) : null;
  const total = subtotal !== null && fee !== null ? subtotal + fee : null;
  const cost = priced.length && priced.every((l) => l.unitCost !== null) ? priced.reduce((t, l) => t + (l.unitCost ?? 0) * l.quantity, 0) : null;

  const update = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function save() {
    setError(null);
    const input: QuotationInput = {
      client: Object.fromEntries(Object.entries(client).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v !== "")) as QuotationInput["client"],
      tier,
      deliveryDistanceKm: num(distance),
      deliveryFee: num(deliveryFee),
      validDays: Number(validDays) || 14,
      notes,
      staffNotes,
      lines: payloadLines,
    };
    startSaving(async () => {
      const result = await saveQuotation(quote?.id ?? null, input);
      if (!result.ok) return setError(result.error);
      if (!quote) router.push(`/admin/quotations/${result.id}`);
      else router.refresh();
    });
  }

  const label = "block font-body text-xs text-slate";
  return (
    <div className="space-y-6">
      <section className="rounded-sm border border-basalt/10 bg-white p-4">
        <h3 className="font-display text-base font-bold text-basalt">Client</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              ["name", "Full name *"],
              ["companyName", "Company"],
              ["email", "Email"],
              ["phone", "Phone / WhatsApp"],
              ["vatNumber", "Client VAT number"],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className={label}>
              {text}
              <input value={client[key]} disabled={readOnly} onChange={(e) => setClient({ ...client, [key]: e.target.value })} className={inputClass} type={key === "email" ? "email" : "text"} />
            </label>
          ))}
          <label className={label}>
            Province
            <select value={client.province} disabled={readOnly} onChange={(e) => setClient({ ...client, province: e.target.value })} className={inputClass}>
              <option value="">—</option>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className={`${label} sm:col-span-2 lg:col-span-3`}>
            Delivery address
            <input value={client.address} disabled={readOnly} onChange={(e) => setClient({ ...client, address: e.target.value })} className={inputClass} />
          </label>
        </div>
      </section>

      <section className="rounded-sm border border-basalt/10 bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className="font-display text-base font-bold text-basalt">Products</h3>
          <label className={label}>
            List prices at
            <select value={tier} disabled={readOnly} onChange={(e) => setTier(e.target.value as QuotationInput["tier"])} className={inputClass}>
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!readOnly && <ProductSearch onPick={(p) => setLines((ls) => [...ls, { key: `l${keySeq++}`, sku: p.sku, name: p.name, units: p.units, unit: p.units[0]?.unit ?? "ton", quantity: "1", mode: "LIST", unitCost: "", markupPercent: "", unitPrice: "", note: "" }])} />}
        {lines.length === 0 ? (
          <p className="mt-3 font-body text-sm text-slate">Search for products above — every product on the platform can be quoted, priced or not.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[900px] font-body text-sm">
              <thead className="text-left text-xs text-slate">
                <tr>
                  <th className="p-2">Product</th>
                  <th className="p-2">Qty &amp; unit</th>
                  <th className="p-2">Price from</th>
                  <th className="p-2">Cost / price</th>
                  <th className="p-2 text-right">Unit price</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-basalt/5 align-top">
                {lines.map((l, i) => {
                  const p = priced[i];
                  return (
                    <tr key={l.key}>
                      <td className="p-2">
                        <p className="font-semibold text-basalt">{l.name}</p>
                        <p className="font-mono text-[10px] text-slate">
                          {l.sku}
                          {p?.listUnitPrice != null ? ` · list ${formatZAR(p.listUnitPrice)}` : " · no list price"}
                        </p>
                        <input value={l.note} disabled={readOnly} onChange={(e) => update(l.key, { note: e.target.value })} placeholder="Note on the quotation (optional)" className={`${inputClass} !mt-1 !py-1 text-xs`} />
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <input aria-label="Quantity" type="number" min={0} step="any" value={l.quantity} disabled={readOnly} onChange={(e) => update(l.key, { quantity: e.target.value })} className={`${inputClass} !mt-0 w-20`} />
                          <select aria-label="Unit" value={l.unit} disabled={readOnly} onChange={(e) => update(l.key, { unit: e.target.value })} className={`${inputClass} !mt-0 w-28`}>
                            {l.units.map((u) => (
                              <option key={u.unit} value={u.unit}>
                                {u.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="p-2">
                        <select aria-label="Price from" value={l.mode} disabled={readOnly} onChange={(e) => update(l.key, { mode: e.target.value as PriceMode })} className={`${inputClass} !mt-0`}>
                          <option value="LIST" disabled={p?.listUnitPrice === null}>
                            List price
                          </option>
                          <option value="COST">Supplier cost + markup</option>
                          <option value="PRICE">Fixed price</option>
                        </select>
                      </td>
                      <td className="p-2">
                        {l.mode === "COST" && (
                          <div className="flex gap-1">
                            <input aria-label="Supplier cost per unit (incl. VAT)" type="number" min={0} step="0.01" placeholder="Cost R" value={l.unitCost} disabled={readOnly} onChange={(e) => update(l.key, { unitCost: e.target.value })} className={`${inputClass} !mt-0 w-24`} />
                            <input
                              aria-label="Markup %"
                              type="number"
                              min={0}
                              step="0.1"
                              placeholder={p?.standardMarkupPercent != null ? `${p.standardMarkupPercent}%` : "%"}
                              value={l.markupPercent}
                              disabled={readOnly}
                              onChange={(e) => update(l.key, { markupPercent: e.target.value })}
                              className={`${inputClass} !mt-0 w-20`}
                            />
                          </div>
                        )}
                        {l.mode === "PRICE" && (
                          <input aria-label="Price per unit (incl. VAT)" type="number" min={0} step="0.01" placeholder="Price R" value={l.unitPrice} disabled={readOnly} onChange={(e) => update(l.key, { unitPrice: e.target.value })} className={`${inputClass} !mt-0 w-28`} />
                        )}
                        {l.mode === "COST" && p?.standardMarkupPercent != null && <p className="mt-1 text-[11px] text-slate">Standard markup {p.standardMarkupPercent}%</p>}
                      </td>
                      <td className="p-2 text-right tabular-nums">
                        {p?.unitPrice != null ? formatZAR(p.unitPrice) : <span className="text-red-800">Needs a price</span>}
                        {p?.markupPercent != null && <p className="text-[11px] text-slate">{p.markupPercent}% markup</p>}
                      </td>
                      <td className="p-2 text-right tabular-nums">{p?.lineTotal != null ? formatZAR(p.lineTotal) : "—"}</td>
                      <td className="p-2 text-right">
                        {!readOnly && (
                          <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-xs text-seam-blue hover:underline" aria-label={`Remove ${l.name}`}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3 rounded-sm border border-basalt/10 bg-white p-4">
          <h3 className="font-display text-base font-bold text-basalt">Delivery and terms</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={label}>
              Distance from supplier (km)
              <input type="number" min={0} value={distance} disabled={readOnly} onChange={(e) => setDistance(e.target.value)} className={inputClass} />
            </label>
            <label className={label}>
              Delivery fee (R, incl. VAT)
              <input
                type="number"
                min={0}
                step="0.01"
                value={deliveryFee}
                disabled={readOnly}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder={pricing?.suggestedDelivery?.total != null ? `Suggested ${pricing.suggestedDelivery.total}` : "Enter the fee"}
                className={inputClass}
              />
            </label>
            <label className={label}>
              Valid for (days)
              <input type="number" min={1} max={90} value={validDays} disabled={readOnly} onChange={(e) => setValidDays(e.target.value)} className={inputClass} />
            </label>
          </div>
          {pricing?.suggestedDelivery && <p className="font-body text-xs text-slate">{pricing.suggestedDelivery.note} Leave the fee empty to use the suggestion.</p>}
          <label className={label}>
            Notes on the quotation (the client sees these)
            <textarea rows={2} value={notes} disabled={readOnly} onChange={(e) => setNotes(e.target.value)} className={inputClass} maxLength={1000} />
          </label>
          <label className={label}>
            Staff notes (internal — supplier, contact, how the price was agreed)
            <textarea rows={2} value={staffNotes} disabled={readOnly} onChange={(e) => setStaffNotes(e.target.value)} className={inputClass} maxLength={1000} />
          </label>
        </div>
        <div className="rounded-sm border border-basalt/10 bg-white p-4 font-body text-sm">
          <dl className="space-y-1">
            <div className="flex justify-between">
              <dt className="text-slate">Materials</dt>
              <dd className="tabular-nums">{subtotal !== null ? formatZAR(subtotal) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate">Delivery</dt>
              <dd className="tabular-nums">{fee !== null ? (fee === 0 ? "Included" : formatZAR(fee)) : "—"}</dd>
            </div>
            <div className="flex justify-between border-t border-basalt/10 pt-2 font-semibold">
              <dt>Total (incl. VAT)</dt>
              <dd className="tabular-nums">{total !== null ? formatZAR(total) : "—"}</dd>
            </div>
            {total !== null && <p className="text-right text-xs text-slate">Includes VAT {formatZAR((total * 15) / 115)}</p>}
          </dl>
          <div className="mt-3 rounded-sm bg-limestone/70 p-2 text-xs text-slate">
            <p className="font-semibold text-basalt">Margin (staff only)</p>
            {cost !== null && subtotal !== null ? (
              <p>
                Cost {formatZAR(cost)} · margin {formatZAR(subtotal - cost)} ({subtotal ? Math.round(((subtotal - cost) / subtotal) * 1000) / 10 : 0}%)
              </p>
            ) : (
              <p>Shown once every line has a cost (list prices carry theirs; typed prices don&apos;t).</p>
            )}
          </div>
          {error && (
            <p role="alert" className="mt-3 text-xs text-red-800">
              {error}
            </p>
          )}
          {!readOnly && (
            <button type="button" onClick={save} disabled={saving || lines.length === 0 || client.name.trim().length < 2} className="mt-4 w-full rounded-sm bg-seam-blue px-4 py-2.5 font-semibold text-limestone hover:bg-basalt disabled:opacity-50">
              {saving ? "Saving…" : quote ? "Save changes" : "Save draft"}
            </button>
          )}
          {quote?.status === "QUOTED" && !readOnly && <p className="mt-2 text-[11px] text-slate">Saving changes takes it back to draft: send it again for the client to see them.</p>}
        </div>
      </section>
    </div>
  );
}

function ProductSearch({ onPick }: { onPick: (p: { sku: string; name: string; units: QuoteUnit[] }) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchQuoteProducts>>>([]);
  const seq = useRef(0);
  useEffect(() => {
    const mine = ++seq.current;
    if (q.trim().length < 2) return setResults([]);
    const timer = setTimeout(async () => {
      const found = await searchQuoteProducts(q);
      if (mine === seq.current) setResults(found);
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);
  return (
    <div className="relative mt-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Add a product — search by name or SKU (e.g. 19mm stone, IBR, AA-CEM)" className={inputClass} aria-label="Search products" />
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-sm border border-basalt/20 bg-white shadow-lg">
          {results.map((p) => (
            <li key={p.sku}>
              <button
                type="button"
                onClick={() => {
                  onPick(p);
                  setQ("");
                  setResults([]);
                }}
                className="block w-full px-3 py-2 text-left font-body text-sm hover:bg-limestone"
              >
                <span className="font-semibold text-basalt">{p.name}</span> <span className="font-mono text-[10px] text-slate">{p.sku}</span>
                <span className="block text-xs text-slate">
                  {p.category}
                  {!p.isActive ? " · hidden on the storefront" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
