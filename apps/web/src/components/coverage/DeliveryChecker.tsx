"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNearestDeliveryPoint } from "@/components/suppliers/useNearestDeliveryPoint";
import type { CoverageTown } from "@/data/coverage-towns";
import type { NearestDeliveryPoint } from "@/lib/suppliers";
import { EXPRESS } from "@/data/express";

type Band = { label: string; minKm: number; maxKm: number };
type Option = { slug: string; name: string };
type Result = { status: "idle" } | { status: "looking" } | { status: "found"; from: string; town: string; province: string; distanceKm: number } | { status: "none" } | { status: "error"; message: string };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * "Do you deliver to me, and from where?" — the public location service.
 * Pick your town (or suburb) or share your location; it finds the nearest
 * approved partner supplier for the material and shows the delivery band.
 * Only the distance comes back; the visitor's location isn't stored.
 */
export function DeliveryChecker({ towns, materials, bands, quoteOverKm }: { towns: CoverageTown[]; materials: Option[]; bands: Band[]; quoteOverKm: number }) {
  const [query, setQuery] = useState("");
  const [material, setMaterial] = useState("");
  const [town, setTown] = useState<CoverageTown | null>(null);
  const [result, setResult] = useState<Result>({ status: "idle" });
  const { state: geo, locate } = useNearestDeliveryPoint();

  const matches = useMemo(() => {
    const q = norm(query);
    if (q.length < 2 || (town && town.name === query)) return [];
    return towns
      .filter((t) => [t.name, ...(t.aliases ?? [])].some((label) => norm(label).startsWith(q) || norm(label).includes(` ${q}`)))
      .slice(0, 6);
  }, [query, town, towns]);

  // A chosen town (or a new material for it) looks up the nearest supplier.
  useEffect(() => {
    if (!town) return;
    const controller = new AbortController();
    setResult({ status: "looking" });
    const search = new URLSearchParams({ lat: String(town.lat), lng: String(town.lng) });
    if (material) search.set("category", material);
    fetch(`/api/delivery-points/nearest?${search}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<NearestDeliveryPoint>) : Promise.reject()))
      .then((p) => setResult(p.found ? { status: "found", from: town.name, town: p.town, province: p.province, distanceKm: p.distanceKm } : { status: "none" }))
      .catch((error: unknown) => {
        if ((error as Error)?.name !== "AbortError") setResult({ status: "error", message: "We couldn't look that up just now — please try again." });
      });
    return () => controller.abort();
  }, [town, material]);

  // "Use my location" answers through the shared hook.
  useEffect(() => {
    if (geo.status === "found") setResult({ status: "found", from: "your location", town: geo.town, province: geo.province, distanceKm: geo.distanceKm });
    else if (geo.status === "none") setResult({ status: "none" });
    else if (geo.status === "error") setResult({ status: "error", message: geo.message.replace(/ Enter the distance yourself\.?/, " Pick your town instead.") });
    else if (geo.status === "locating") setResult({ status: "looking" });
  }, [geo]);

  const band = result.status === "found" ? bands.find((b) => result.distanceKm >= b.minKm && result.distanceKm <= b.maxKm) : undefined;

  return (
    <div className="rounded-sm border border-seam-blue/30 bg-white p-5 shadow-sm">
      <p className="flex items-center gap-2 font-body text-base font-semibold text-basalt">
        <MapPin className="h-4 w-4 text-seam-blue" aria-hidden="true" />
        Check delivery to your site
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_200px_auto] sm:items-end">
        <div className="relative">
          <label htmlFor="delivery-town" className="font-mono text-[10px] uppercase text-slate">Town or suburb</label>
          <input
            id="delivery-town"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setTown(null);
            }}
            placeholder="e.g. Midrand, Pinetown, Mthatha"
            className="mt-1 w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm"
          />
          {matches.length > 0 && (
            <ul className="absolute left-0 right-0 z-20 mt-1 rounded-sm border border-basalt/10 bg-white py-1 shadow-lg">
              {matches.map((t) => (
                <li key={`${t.province}-${t.name}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery(t.name);
                      setTown(t);
                    }}
                    className="block w-full px-3 py-2 text-left font-body text-sm text-basalt hover:bg-limestone"
                  >
                    {t.name} <span className="text-xs text-slate">· {t.province}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="block">
          <span className="font-mono text-[10px] uppercase text-slate">Material</span>
          <select value={material} onChange={(e) => setMaterial(e.target.value)} className="mt-1 block w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm">
            <option value="">Any material</option>
            {materials.map((m) => (
              <option key={m.slug} value={m.slug}>{m.name}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => {
            setTown(null);
            void locate(material || undefined);
          }}
          className="rounded-sm border border-seam-blue px-4 py-2 font-body text-sm font-semibold text-seam-blue hover:bg-seam-blue hover:text-limestone"
        >
          Use my location
        </button>
      </div>
      <div aria-live="polite" className="mt-3 min-h-[1.5rem] font-body text-sm text-basalt">
        {result.status === "looking" && <p className="text-slate">Finding the nearest partner supplier…</p>}
        {result.status === "found" && (
          <p>
            Nearest partner supplier to {result.from}: <strong>{result.town}</strong>, {result.province} — about <strong>{Math.round(result.distanceKm)} km</strong> away.{" "}
            {result.distanceKm > quoteOverKm ? (
              <>
                That&apos;s beyond our delivery bands, so we&apos;ll quote it.{" "}
                <Link href="/quote" className="font-semibold text-seam-blue hover:underline">Request a quote →</Link>
              </>
            ) : band ? (
              <>
                Delivery band: <strong>{band.label}</strong>. <Link href="/delivery-areas" className="text-seam-blue hover:underline">See charges</Link>
              </>
            ) : null}
            {result.distanceKm <= EXPRESS.radiusKm && (
              <span className="mt-2 block rounded-sm bg-ochre-gold/15 px-2 py-1 text-xs">
                <strong>Within {EXPRESS.radiusKm} km — AA 60/120 may be available:</strong> qualifying materials delivered within {EXPRESS.promiseMinutes} minutes,
                checked at checkout. <Link href="/aa-60-120" className="font-semibold text-seam-blue hover:underline">How it works →</Link>
              </span>
            )}
          </p>
        )}
        {result.status === "none" && (
          <p>
            No mapped partner supplier for that material yet — <Link href="/quote" className="font-semibold text-seam-blue hover:underline">request a quote</Link> and we&apos;ll source it.
          </p>
        )}
        {result.status === "error" && <p className="text-slate">{result.message}</p>}
      </div>
      <p className="font-body text-[11px] text-slate">
        Straight-line distance; the road distance is confirmed when you order. Your location is used only for this lookup and isn&apos;t saved.{" "}
        <Link href="/coverage" className="text-seam-blue hover:underline">Map of every town we serve →</Link>
      </p>
    </div>
  );
}
