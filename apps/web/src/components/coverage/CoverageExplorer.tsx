"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CoverageTown } from "@/data/coverage-towns";
import { WHATSAPP_NUMBER } from "@/data/social";

const CoverageMap = dynamic(() => import("./CoverageMap").then((m) => m.CoverageMap), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-sm bg-limestone sm:h-[520px]" />,
});

type Band = { minKm: number; maxKm: number; label: string };
type Nearest = { found: true; town: string; province: string; distanceKm: number } | { found: false };
type Match = { town: CoverageTown; via?: string; score: number };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’'`.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function search(towns: CoverageTown[], query: string): Match[] {
  const q = norm(query);
  if (q.length < 2) return [];
  const results: Match[] = [];
  for (const town of towns) {
    let best: Match | null = null;
    for (const [label, via] of [[town.name, undefined] as const, ...(town.aliases ?? []).map((a) => [a, a] as const)]) {
      const n = norm(label);
      const score = n === q ? 3 : n.startsWith(q) ? 2 : n.includes(q) ? 1 : 0;
      if (score > 0 && (!best || score > best.score || (score === best.score && !via))) best = { town, via, score: score + (via ? 0 : 0.5) };
    }
    if (best) results.push(best);
  }
  const tierRank = { metro: 0, city: 1, town: 2 };
  return results.sort((a, b) => b.score - a.score || tierRank[a.town.tier] - tierRank[b.town.tier] || a.town.name.localeCompare(b.town.name)).slice(0, 8);
}

/**
 * "Do you deliver to my town?" — search (towns, suburbs, old names), a map
 * that flies to the result, and every town grouped by province.
 */
export function CoverageExplorer({
  towns,
  provinces,
  initialProvince,
  bands,
  quoteOverKm,
}: {
  towns: CoverageTown[];
  provinces: string[];
  initialProvince?: string;
  bands: Band[];
  quoteOverKm: number;
}) {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<{ town: CoverageTown; via?: string } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [nearest, setNearest] = useState<Nearest | null>(null);
  const [openProvince, setOpenProvince] = useState<string | null>(initialProvince ?? null);

  const suggestions = useMemo(() => search(towns, query), [towns, query]);
  const byProvince = useMemo(
    () => provinces.map((p) => ({ province: p, towns: towns.filter((t) => t.province === p).sort((a, b) => a.name.localeCompare(b.name)) })),
    [towns, provinces],
  );

  function choose(match: { town: CoverageTown; via?: string }) {
    setSelected(match);
    setQuery(match.via ?? match.town.name);
    setSubmitted(match.via ?? match.town.name);
    setOpen(false);
    setOpenProvince(match.town.province);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(query.trim());
    const top = suggestions[active] ?? suggestions[0];
    if (top && top.score >= 1.5) choose(top);
    else {
      setSelected(null);
      setOpen(suggestions.length > 0);
    }
  }

  useEffect(() => {
    setNearest(null);
    if (!selected) return;
    const controller = new AbortController();
    fetch(`/api/delivery-points/nearest?lat=${selected.town.lat}&lng=${selected.town.lng}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Nearest | null) => data && setNearest(data))
      .catch(() => undefined);
    return () => controller.abort();
  }, [selected]);

  const band = nearest?.found ? bands.find((b) => nearest.distanceKm >= b.minKm && nearest.distanceKm <= b.maxKm) : undefined;
  const notFound = submitted.length >= 2 && !selected && (suggestions.length === 0 || norm(submitted) !== norm(query) || !open);
  const whatsapp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, do you deliver to ${submitted || "my town"}?`)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
      <div className="space-y-4">
        <form onSubmit={submit} role="search" className="relative">
          <label htmlFor="coverage-search" className="font-mono text-[10px] uppercase text-slate">Your town, suburb or city</label>
          <div className="mt-1 flex gap-2">
            <input
              id="coverage-search"
              role="combobox"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="coverage-suggestions"
              aria-autocomplete="list"
              aria-activedescendant={open && suggestions[active] ? `coverage-option-${active}` : undefined}
              autoComplete="off"
              value={query}
              placeholder="e.g. Sandton, Polokwane, Ballito"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                setActive(0);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                } else if (e.key === "Escape") setOpen(false);
              }}
              className="w-full rounded-sm border border-basalt/20 bg-white px-3 py-2.5 font-body text-sm"
            />
            <button type="submit" className="shrink-0 rounded-sm bg-seam-blue px-4 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">
              Check
            </button>
          </div>
          {open && suggestions.length > 0 && (
            <ul id="coverage-suggestions" role="listbox" className="absolute z-[1000] mt-1 w-full overflow-hidden rounded-sm border border-basalt/15 bg-white shadow-lg">
              {suggestions.map((s, i) => (
                <li
                  key={`${s.town.province}|${s.town.name}|${s.via ?? ""}`}
                  id={`coverage-option-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(s);
                  }}
                  className={`cursor-pointer px-3 py-2 font-body text-sm ${i === active ? "bg-limestone" : ""}`}
                >
                  <span className="font-semibold text-basalt">{s.via ?? s.town.name}</span>
                  <span className="ml-2 text-xs text-slate">{s.via ? `part of ${s.town.name}, ` : ""}{s.town.province}</span>
                </li>
              ))}
            </ul>
          )}
        </form>

        <div aria-live="polite">
          {selected ? (
            <div className="rounded-sm border border-seam-blue/30 bg-seam-blue/5 p-5">
              <p className="font-mono text-[11px] uppercase text-seam-blue">✓ We deliver here</p>
              <h2 className="mt-1 font-display text-xl font-bold text-basalt">
                {selected.via ?? selected.town.name}, {selected.town.province}
              </h2>
              {selected.via && <p className="mt-1 font-body text-xs text-slate">{selected.via} is served as part of {selected.town.name}.</p>}
              {nearest?.found ? (
                <p className="mt-3 font-body text-sm text-basalt">
                  Nearest partner supplier: <strong>{nearest.town}</strong>, about {Math.round(nearest.distanceKm)} km away.{" "}
                  {nearest.distanceKm > quoteOverKm
                    ? "Delivery that far is quoted separately."
                    : band
                      ? band.minKm === 0
                        ? "Delivery is included in the list price."
                        : `Delivery falls in the ${band.label} band.`
                      : null}
                </p>
              ) : (
                <p className="mt-3 font-body text-sm text-basalt">
                  Bulk tipper and bagged delivery from the partner supplier nearest your site. Your exact delivery charge shows in the cart.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/products" className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">Shop materials</Link>
                <Link href="/quote" className="rounded-sm border border-basalt/20 bg-white px-4 py-2 font-body text-sm text-basalt hover:border-seam-blue">Request a quote</Link>
                <Link href="/delivery-areas" className="rounded-sm px-2 py-2 font-body text-sm text-seam-blue hover:underline">Delivery charges</Link>
              </div>
            </div>
          ) : notFound ? (
            <div className="rounded-sm border border-ochre-gold/40 bg-ochre-gold/10 p-5">
              <p className="font-body text-sm font-semibold text-basalt">&ldquo;{submitted}&rdquo; isn&apos;t on our list yet — but we deliver nationally.</p>
              <p className="mt-1 font-body text-sm text-slate">Most towns are reached from a nearby partner supplier. Ask us and we&apos;ll confirm with a delivery price.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/quote" className="rounded-sm bg-seam-blue px-4 py-2 font-body text-sm font-semibold text-limestone hover:bg-basalt">Request a quote</Link>
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-sm border border-basalt/20 bg-white px-4 py-2 font-body text-sm text-basalt hover:border-seam-blue">
                  Ask on WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <p className="rounded-sm border border-dashed border-basalt/20 p-4 font-body text-sm text-slate">
              Search for your town, suburb or the old name you know it by — or pick it from the provinces below or on the map.
            </p>
          )}
        </div>

        <div className="space-y-2">
          {byProvince.map(({ province, towns: list }) => (
            <details
              key={province}
              open={openProvince === province}
              onToggle={(e) => {
                const isOpen = (e.target as HTMLDetailsElement).open;
                if (isOpen) setOpenProvince(province);
                else if (openProvince === province) setOpenProvince(null);
              }}
              className="group rounded-sm border border-basalt/10 bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-body text-sm font-semibold text-basalt">
                <span>
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90" aria-hidden="true">›</span>
                  {province}
                </span>
                <span className="font-mono text-[11px] font-normal text-slate">{list.length} towns</span>
              </summary>
              <ul className="flex flex-wrap gap-1.5 border-t border-basalt/10 px-4 py-3">
                {list.map((town) => {
                  const on = selected?.town === town;
                  return (
                    <li key={town.name}>
                      <button
                        type="button"
                        onClick={() => choose({ town })}
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-1 font-body text-xs ${
                          on ? "border-seam-blue bg-seam-blue text-limestone" : town.tier === "town" ? "border-basalt/15 text-basalt hover:border-seam-blue" : "border-basalt/25 font-semibold text-basalt hover:border-seam-blue"
                        }`}
                      >
                        {town.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <CoverageMap towns={towns} selected={selected?.town ?? null} onSelect={(town) => choose({ town })} />
        <p className="mt-2 font-mono text-[10px] text-slate">
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-ochre-gold align-middle" /> Metro
          <span className="ml-3 mr-1 inline-block h-2.5 w-2.5 rounded-full bg-seam-blue align-middle" /> City or town · tap a dot to select it
        </p>
      </div>
    </div>
  );
}
