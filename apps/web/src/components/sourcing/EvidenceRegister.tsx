"use client";

import { FileCheck2, FlaskConical, Layers3, Mountain, Ruler, Search, Truck } from "lucide-react";
import { useState } from "react";

type EvidenceRecord = { category: string; product: string; owner: string; document: string; scope: string; status: string; icon: typeof Mountain };

/** How each kind of claim on the store maps to a document, its owner and its scope. */
const RECORDS: EvidenceRecord[] = [
  { category: "Aggregates", product: "19mm crushed stone (dolomite)", owner: "Partner quarry file", document: "SANS 1083 grading + source record", scope: "Named quarry · current stockpile", status: "Requested from the quarry", icon: Mountain },
  { category: "Aggregates", product: "River sand (washed)", owner: "Producer technical file", document: "Particle size + cleanliness data", scope: "Specific source · intended use", status: "Scope checked before publishing", icon: FlaskConical },
  { category: "Sub-base", product: "G5 natural gravel", owner: "Quarry / laboratory file", document: "Grading, PI + compaction results", scope: "SANS 1200 / TRH14 · project specification", status: "Available on request", icon: Layers3 },
  { category: "Sub-base", product: "G6 natural gravel", owner: "Producer technical file", document: "Material class + test report", scope: "Declared material class", status: "Checked before publishing", icon: Ruler },
  { category: "Cement", product: "Bulk cement 42.5N", owner: "Cement supplier file", document: "Declaration of conformity / CoA", scope: "Cement type · supplier · batch", status: "Batch evidence required", icon: FileCheck2 },
  { category: "Delivery", product: "Bulk or bagged order", owner: "Aggregated Aggregates order file", document: "Order confirmation + delivery note", scope: "Order · vehicle · delivery site", status: "Issued with every delivery", icon: Truck },
];

export function EvidenceRegister() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All materials");
  const categories = ["All materials", ...Array.from(new Set(RECORDS.map((r) => r.category)))];
  const filtered = RECORDS.filter((r) => {
    const matchesCategory = category === "All materials" || r.category === category;
    const text = [r.category, r.product, r.owner, r.document, r.scope, r.status].join(" ").toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase().trim());
  });

  return (
    <div className="rounded-[24px] border border-basalt/10 bg-limestone p-5 lg:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <label className="relative block flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-basalt/40" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search G5, quarry, cement, delivery note…"
            className="w-full rounded-full border border-basalt/15 bg-white px-11 py-3.5 font-body text-sm outline-none transition focus:border-ochre-gold"
            aria-label="Search the evidence register"
          />
        </label>
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-slate">
          {filtered.length} matching record{filtered.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter by material">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            aria-pressed={category === item}
            className={`rounded-full border px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.13em] transition ${
              category === item ? "border-basalt bg-basalt text-limestone" : "border-basalt/15 bg-white text-slate hover:border-ochre-gold hover:text-basalt"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((r) => {
          const Icon = r.icon;
          return (
            <article key={r.product} className="rounded-[18px] border border-basalt/10 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-basalt px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-limestone">{r.category}</span>
                <Icon size={17} className="text-ochre-gold" aria-hidden="true" />
              </div>
              <h3 className="mt-6 font-display text-lg font-bold leading-tight text-basalt">{r.product}</h3>
              <p className="mt-2 font-body text-xs font-semibold text-basalt/75">{r.document}</p>
              <dl className="mt-4 space-y-1.5 font-mono text-[9px] uppercase tracking-[0.1em] text-slate">
                <div><dt className="inline text-ochre-gold">Owner / </dt><dd className="inline">{r.owner}</dd></div>
                <div><dt className="inline text-ochre-gold">Scope / </dt><dd className="inline">{r.scope}</dd></div>
                <div><dt className="inline text-ochre-gold">Our rule / </dt><dd className="inline">{r.status}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
      {filtered.length === 0 && <p className="py-10 text-center font-body text-sm text-slate">Nothing matches that search. Ask us for the source or test evidence you need.</p>}
      <p className="mt-5 font-body text-xs leading-5 text-slate">
        These show the kind of record behind each claim, not live certificates. A product's own documents are on its Compliance Docs tab, or ask us for them.
      </p>
    </div>
  );
}
