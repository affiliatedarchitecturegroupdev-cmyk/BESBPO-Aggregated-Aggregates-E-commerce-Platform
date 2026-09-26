"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PRODUCTS, type Unit } from "@/data/catalogue";
import { CATEGORIES } from "@/data/categories";
import { formatZAR, UNIT_LABELS } from "@/lib/pricing";
import { SALES_EMAIL } from "@/lib/site";

type LineItem = { sku: string; unit: Unit; quantity: number };
type Project = { projectName: string; company: string; contactName: string; email: string; phone: string };
type Delivery = { address: string; province: string; distanceKm: string; notes: string };

const STEPS = ["Project Details", "Materials & Quantities", "Delivery Location", "Review & Submit"];
const PROVINCES = ["KwaZulu-Natal", "Gauteng", "Other province (network expanding)"];

const inputClass = "w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";

function productFor(sku: string) {
  return PRODUCTS.find((p) => p.sku === sku) ?? PRODUCTS[0];
}

function initialLine(params: URLSearchParams): LineItem {
  const product = productFor(params.get("sku") ?? "");
  const unit = params.get("unit") as Unit | null;
  const quantity = Number(params.get("qty"));
  return {
    sku: product.sku,
    unit: unit && product.units.includes(unit) ? unit : product.units[0],
    quantity: quantity > 0 ? quantity : 10,
  };
}

/**
 * Module 3: RFQ / Civil Bulk Quote Flow (wireframe 04). Collects what a
 * human quote needs for orders the pricing framework treats as quote-only —
 * Volume/Civil Bulk account orders of 10m³ or more, deliveries beyond 100km
 * — and, until checkout exists, any order a customer wants priced.
 *
 * Submission opens the customer's email client with the full request
 * addressed to sales; Phase 3 replaces this with POST /api/v1/quotes.
 */
export function QuoteRequestForm() {
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [project, setProject] = useState<Project>({ projectName: "", company: "", contactName: "", email: "", phone: "" });
  const [lines, setLines] = useState<LineItem[]>(() => [initialLine(params)]);
  const [delivery, setDelivery] = useState<Delivery>({
    address: "",
    province: PROVINCES[0],
    distanceKm: params.get("km") ?? "",
    notes: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const updateLine = (index: number, patch: Partial<LineItem>) =>
    setLines((items) =>
      items.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        // Keep the unit only if the (possibly new) product is sold in it.
        const units = productFor(next.sku).units;
        return units.includes(next.unit) ? next : { ...next, unit: units[0] };
      }),
    );

  const canContinue =
    (step !== 0 || (project.contactName.trim() !== "" && /\S+@\S+\.\S+/.test(project.email))) &&
    (step !== 1 || (lines.length > 0 && lines.every((l) => l.quantity > 0))) &&
    (step !== 2 || delivery.address.trim() !== "");

  const estimatedListValue = lines.reduce(
    (sum, line) => sum + (productFor(line.sku).prices.RETAIL[line.unit] ?? 0) * line.quantity,
    0,
  );

  const submit = () => {
    const body = [
      `Project: ${project.projectName || "—"}`,
      `Company: ${project.company || "—"}`,
      `Contact: ${project.contactName} <${project.email}> ${project.phone}`,
      "",
      "Materials:",
      ...lines.map((l) => {
        const p = productFor(l.sku);
        return `- ${l.quantity} ${UNIT_LABELS[l.unit]} ${p.name} (${p.sku})`;
      }),
      "",
      `Delivery: ${delivery.address}, ${delivery.province}`,
      `Approx. distance from supplier: ${delivery.distanceKm ? `${delivery.distanceKm}km` : "unknown"}`,
      `Notes: ${delivery.notes || "—"}`,
      "",
      `Indicative retail list value (excl. delivery): ${formatZAR(estimatedListValue)}`,
    ].join("\n");
    const subject = `Quote request — ${project.projectName || project.company || project.contactName}`;
    window.location.href = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-basalt">Almost done — send the email</h1>
        <p className="mt-3 font-body text-sm text-slate">
          Your email app should have opened with the quote request addressed to{" "}
          <a href={`mailto:${SALES_EMAIL}`} className="text-seam-blue underline">{SALES_EMAIL}</a>. Send it and our team
          responds within 1 business day with delivered pricing.
        </p>
        <button onClick={() => setSubmitted(false)} className="mt-6 font-body text-sm text-seam-blue hover:underline">
          ← Back to the request
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-basalt">RFQ / Bulk Quote Request</h1>
      <p className="mt-1 font-body text-sm text-slate">
        For civil bulk orders, deliveries beyond 100km, or any load you&apos;d like priced delivered.
      </p>

      <ol className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === step ? "step" : undefined}
            className={`rounded-sm border px-3 py-2 text-center font-body text-xs ${
              index === step
                ? "border-seam-blue bg-seam-blue text-limestone"
                : index < step
                  ? "border-seam-blue/40 text-seam-blue"
                  : "border-basalt/20 text-slate"
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-sm border border-basalt/10 bg-white p-6">
        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <h2 className="font-body text-sm font-semibold text-basalt sm:col-span-2">Step 1 — Project Details</h2>
            {(
              [
                ["projectName", "Project / site name"],
                ["company", "Company name (optional)"],
                ["contactName", "Contact name *"],
                ["email", "Contact email *"],
                ["phone", "Phone"],
              ] as [keyof Project, string][]
            ).map(([field, label]) => (
              <label key={field} className="block">
                <span className="font-mono text-[10px] uppercase text-slate">{label}</span>
                <input
                  type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                  value={project[field]}
                  onChange={(e) => setProject({ ...project, [field]: e.target.value })}
                  className={`mt-1 ${inputClass}`}
                />
              </label>
            ))}
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-body text-sm font-semibold text-basalt">Step 2 — Materials & Quantities</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] font-body text-sm">
                <thead>
                  <tr className="border-b border-basalt/10 text-left text-xs text-slate">
                    <th className="py-2">Product</th>
                    <th>Grading / Standard</th>
                    <th>Unit</th>
                    <th>Quantity</th>
                    <th>Est. Unit Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => {
                    const product = productFor(line.sku);
                    return (
                      <tr key={index} className="border-b border-basalt/5">
                        <td className="py-2 pr-2">
                          <select
                            value={line.sku}
                            onChange={(e) => updateLine(index, { sku: e.target.value })}
                            className="w-full max-w-[240px] rounded-sm border border-basalt/20 px-2 py-1"
                          >
                            {CATEGORIES.map((category) => (
                              <optgroup key={category.slug} label={category.name}>
                                {PRODUCTS.filter((p) => p.categorySlug === category.slug).map((p) => (
                                  <option key={p.sku} value={p.sku}>{p.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td className="text-xs text-slate">{product.gradingStandard ?? "—"}</td>
                        <td>
                          <select
                            value={line.unit}
                            onChange={(e) => updateLine(index, { unit: e.target.value as Unit })}
                            className="rounded-sm border border-basalt/20 px-2 py-1"
                          >
                            {product.units.map((unit) => (
                              <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={line.quantity}
                            onChange={(e) => updateLine(index, { quantity: Math.max(0, Number(e.target.value)) })}
                            className="w-24 rounded-sm border border-basalt/20 px-2 py-1"
                          />
                        </td>
                        <td>{formatZAR(product.prices.RETAIL[line.unit] ?? 0)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setLines((items) => items.filter((_, i) => i !== index))}
                            className="text-xs text-slate hover:text-basalt"
                            aria-label={`Remove ${product.name}`}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() => setLines((items) => [...items, { sku: PRODUCTS[0].sku, unit: PRODUCTS[0].units[0], quantity: 1 }])}
              className="mt-3 rounded-sm border border-basalt/20 px-3 py-1.5 font-body text-xs font-semibold text-seam-blue"
            >
              + Add Another Product
            </button>
            <p className="mt-4 rounded-sm bg-seam-blue/5 p-3 font-body text-xs text-slate">
              Estimated unit prices are retail list prices; trade accounts receive 8–15% off. Volume/Civil Bulk account
              orders of 10m³ or more, and any delivery beyond 100km, are quoted individually — our team responds within 1
              business day with delivered pricing.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <h2 className="font-body text-sm font-semibold text-basalt sm:col-span-2">Step 3 — Delivery Location</h2>
            <label className="block sm:col-span-2">
              <span className="font-mono text-[10px] uppercase text-slate">Delivery address / site location *</span>
              <input value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Province</span>
              <select value={delivery.province} onChange={(e) => setDelivery({ ...delivery, province: e.target.value })} className={`mt-1 ${inputClass}`}>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="font-mono text-[10px] uppercase text-slate">Approx. distance from supplier (km, if known)</span>
              <input type="number" min={0} value={delivery.distanceKm} onChange={(e) => setDelivery({ ...delivery, distanceKm: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="block sm:col-span-2">
              <span className="font-mono text-[10px] uppercase text-slate">Site access / scheduling notes</span>
              <textarea rows={3} value={delivery.notes} onChange={(e) => setDelivery({ ...delivery, notes: e.target.value })} className={`mt-1 ${inputClass}`} />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="font-body text-sm text-basalt">
            <h2 className="font-semibold">Step 4 — Review & Submit</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[160px_1fr]">
              <dt className="text-slate">Project</dt>
              <dd>{project.projectName || "—"}{project.company && ` · ${project.company}`}</dd>
              <dt className="text-slate">Contact</dt>
              <dd>{project.contactName} · {project.email}{project.phone && ` · ${project.phone}`}</dd>
              <dt className="text-slate">Delivery</dt>
              <dd>
                {delivery.address}, {delivery.province}
                {delivery.distanceKm && ` · ~${delivery.distanceKm}km from supplier`}
              </dd>
            </dl>
            <ul className="mt-4 space-y-1 border-t border-basalt/10 pt-4">
              {lines.map((line, index) => {
                const product = productFor(line.sku);
                return (
                  <li key={index} className="flex justify-between gap-4">
                    <span>
                      {line.quantity} {UNIT_LABELS[line.unit]} — {product.name}
                    </span>
                    <span className="text-slate">{formatZAR((product.prices.RETAIL[line.unit] ?? 0) * line.quantity)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 flex justify-between border-t border-basalt/10 pt-3 font-semibold">
              <span>Indicative list value (excl. delivery)</span>
              <span>{formatZAR(estimatedListValue)}</span>
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-sm border border-basalt/20 px-5 py-2 font-body text-sm text-basalt disabled:opacity-30"
        >
          ← Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue}
            className="rounded-sm bg-seam-blue px-5 py-2 font-body text-sm text-limestone disabled:opacity-40"
          >
            Continue →
          </button>
        ) : (
          <button type="button" onClick={submit} className="rounded-sm bg-ochre-gold px-5 py-2 font-body text-sm font-semibold text-basalt">
            Submit Quote Request
          </button>
        )}
      </div>
    </div>
  );
}
