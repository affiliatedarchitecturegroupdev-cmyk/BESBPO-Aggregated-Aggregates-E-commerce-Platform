"use client";

import { useState } from "react";
import { PRODUCTS, type Unit } from "@/data/catalogue";
import { UNIT_LABELS } from "@/lib/pricing";

type LineItem = { productSku: string; unit: Unit; quantity: number };

const STEPS = ["Project Details", "Materials & Quantities", "Delivery Location", "Review & Submit"];

/**
 * Module 3: RFQ / Civil Bulk Quote Flow. A multi-step request for orders the
 * pricing framework already treats as quote-only — Volume/Civil Bulk tier
 * (>=10m3) and any delivery beyond 100km.
 */
export default function QuotePage() {
  const [step, setStep] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { productSku: PRODUCTS[0].sku, unit: PRODUCTS[0].units[0], quantity: 10 },
  ]);
  const [submitted, setSubmitted] = useState(false);

  const addLineItem = () =>
    setLineItems((items) => [...items, { productSku: PRODUCTS[0].sku, unit: PRODUCTS[0].units[0], quantity: 1 }]);

  const removeLineItem = (index: number) =>
    setLineItems((items) => items.filter((_, i) => i !== index));

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-basalt">Quote request received</h1>
        <p className="mt-3 font-body text-sm text-slate">
          Our team responds within 1 business day with delivered pricing. A reference number will be emailed to you.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-basalt">RFQ / Bulk Quote Request</h1>
      <p className="mt-1 font-body text-sm text-slate">Multi-step flow for civil bulk & &gt;100km delivery quotes.</p>

      <div className="mt-6 flex gap-2">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`flex-1 rounded-sm border px-3 py-2 text-center font-body text-xs ${
              index === step ? "border-seam-blue bg-seam-blue text-limestone" : "border-basalt/20 text-slate"
            }`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-sm border border-basalt/10 bg-white p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-body text-sm font-semibold text-basalt">Step 1 — Project Details</h2>
            <input placeholder="Project / site name" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
            <input placeholder="Company name" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
            <input placeholder="Contact email" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-body text-sm font-semibold text-basalt">Step 2 — Materials & Quantities</h2>
            <table className="mt-4 w-full font-body text-sm">
              <thead>
                <tr className="border-b border-basalt/10 text-left text-xs text-slate">
                  <th className="py-2">Product</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, index) => (
                  <tr key={index} className="border-b border-basalt/5">
                    <td className="py-2">
                      <select
                        value={item.productSku}
                        onChange={(e) =>
                          setLineItems((items) =>
                            items.map((it, i) => {
                              if (i !== index) return it;
                              // Keep the unit only if the newly chosen product is sold in it.
                              const units = PRODUCTS.find((p) => p.sku === e.target.value)!.units;
                              return { ...it, productSku: e.target.value, unit: units.includes(it.unit) ? it.unit : units[0] };
                            }),
                          )
                        }
                        className="rounded-sm border border-basalt/20 px-2 py-1"
                      >
                        {PRODUCTS.map((p) => (
                          <option key={p.sku} value={p.sku}>{p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          setLineItems((items) =>
                            items.map((it, i) => (i === index ? { ...it, unit: e.target.value as LineItem["unit"] } : it)),
                          )
                        }
                        className="rounded-sm border border-basalt/20 px-2 py-1"
                      >
                        {PRODUCTS.find((p) => p.sku === item.productSku)!.units.map((unit) => (
                          <option key={unit} value={unit}>
                            {UNIT_LABELS[unit]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          setLineItems((items) =>
                            items.map((it, i) => (i === index ? { ...it, quantity: Number(e.target.value) } : it)),
                          )
                        }
                        className="w-24 rounded-sm border border-basalt/20 px-2 py-1"
                      />
                    </td>
                    <td>
                      <button onClick={() => removeLineItem(index)} className="text-xs text-slate hover:text-basalt">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addLineItem} className="mt-3 font-body text-xs font-semibold text-seam-blue">
              + Add Another Product
            </button>
            <p className="mt-4 rounded-sm bg-seam-blue/5 p-3 font-body text-xs text-slate">
              Note: Volume/Civil Bulk account orders of 10m³ or more, and any delivery beyond 100km, are quoted
              individually — our team responds within 1 business day with delivered pricing.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-body text-sm font-semibold text-basalt">Step 3 — Delivery Location</h2>
            <input placeholder="Delivery address / postcode" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
            <select className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm">
              <option>KwaZulu-Natal</option>
              <option>Gauteng</option>
              <option>Western Cape</option>
              <option>Eastern Cape</option>
              <option>Limpopo</option>
              <option>Mpumalanga</option>
              <option>North West</option>
            </select>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-body text-sm font-semibold text-basalt">Step 4 — Review & Submit</h2>
            <ul className="mt-3 space-y-1 font-body text-sm text-basalt">
              {lineItems.map((item, index) => {
                const product = PRODUCTS.find((p) => p.sku === item.productSku);
                return (
                  <li key={index}>
                    {item.quantity} {UNIT_LABELS[item.unit]} — {product?.name}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-sm border border-basalt/20 px-5 py-2 font-body text-sm text-basalt disabled:opacity-30"
        >
          ← Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
            className="rounded-sm bg-seam-blue px-5 py-2 font-body text-sm text-limestone"
          >
            Continue →
          </button>
        ) : (
          <button
            onClick={() => setSubmitted(true)}
            className="rounded-sm bg-ochre-gold px-5 py-2 font-body text-sm font-semibold text-basalt"
          >
            Submit Quote Request
          </button>
        )}
      </div>
    </div>
  );
}
