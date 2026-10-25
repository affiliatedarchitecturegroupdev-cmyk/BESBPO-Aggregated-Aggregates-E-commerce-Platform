"use client";

import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { saveMyLocation, useMyLocation, type MyLocation } from "@/lib/my-location";

type Nearest = { town: string; province: string; distanceKm: number };
type Availability = { listed: number; range: number; listedProvinces: string[]; nearestListed: Nearest | null; nearestRange: Nearest | null };
type Town = { label: string; lat: number; lng: number };

/** Beyond this, a supplier isn't "near" — the delivery bands end at 100 km (Shipping & Delivery policy). */
const NEAR_KM = 100;

/**
 * "Available near you" on a product page (ROADMAP 4.4, docs/availability.md): whether a partner supplier near the
 * shopper lists this product, or at least supplies its category, and how far away. Honest wording only — never
 * "in stock", never a supplier's name. The shopper's town is remembered in this browser only.
 */
export function AvailableNearYou({ sku }: { sku: string }) {
  const location = useMyLocation();
  const [data, setData] = useState<Availability | null>(null);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (location === undefined) return;
    const controller = new AbortController();
    const search = new URLSearchParams({ sku });
    if (location) {
      search.set("lat", String(location.lat));
      search.set("lng", String(location.lng));
    }
    setFailed(false);
    fetch(`/api/availability?${search}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Availability) => setData(d))
      .catch((error: unknown) => {
        if ((error as Error)?.name !== "AbortError") setFailed(true);
      });
    return () => controller.abort();
  }, [sku, location]);

  if (location === undefined || failed) return null;

  const shared = location?.label === "your location";
  const place = location ? (shared ? "you" : location.label.split(",")[0]) : "";
  let message: React.ReactNode = null;
  if (data && location) {
    const listed = data.nearestListed && data.nearestListed.distanceKm <= NEAR_KM ? data.nearestListed : null;
    const range = data.nearestRange && data.nearestRange.distanceKm <= NEAR_KM ? data.nearestRange : null;
    if (listed) message = <><strong className="text-basalt">Available near you:</strong> a partner supplier about {listed.distanceKm} km away, in {listed.town}, lists this product.</>;
    else if (range) message = <>Partner suppliers of this range are about {range.distanceKm} km away, in {range.town} — we confirm this product with them on your order or quote.</>;
    else message = <>No partner supplier within {NEAR_KM} km of {place} yet — we&apos;ll quote delivery from the nearest one.</>;
  } else if (data && !location) {
    message =
      data.listed > 0 ? (
        <>Listed by {data.listed === 1 ? "a partner supplier" : `${data.listed} partner suppliers`} in {data.listedProvinces.join(", ")}.</>
      ) : data.range > 0 ? (
        <>Supplied through {data.range === 1 ? "a partner supplier" : `${data.range} partner suppliers`} of this range.</>
      ) : null;
  }

  return (
    <div className="mt-3 rounded-sm border border-basalt/10 bg-white px-3 py-2 font-body text-xs text-slate">
      <p className="flex items-start gap-2">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-seam-blue" aria-hidden />
        <span>
          {message}
          {location && !editing && (
            <>
              {" "}
              <button type="button" onClick={() => setEditing(true)} className="text-seam-blue hover:underline">
                {shared ? "Change location" : `Not in ${place}?`}
              </button>
            </>
          )}
          {!location && !editing && (
            <>
              {message ? " " : ""}
              <button type="button" onClick={() => setEditing(true)} className="font-semibold text-seam-blue hover:underline">
                See what&apos;s available near you
              </button>
            </>
          )}
        </span>
      </p>
      {editing && <LocationPicker onDone={() => setEditing(false)} current={location ?? null} />}
    </div>
  );
}

/** Pick a town (or suburb) we deliver to, or share the browser's location once. */
function LocationPicker({ onDone, current }: { onDone: () => void; current: MyLocation | null }) {
  const [query, setQuery] = useState("");
  const [towns, setTowns] = useState<Town[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) return setTowns([]);
    const controller = new AbortController();
    fetch(`/api/towns?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((d: { towns: Town[] }) => setTowns(d.towns))
      .catch(() => undefined);
    return () => controller.abort();
  }, [query]);

  const choose = (location: MyLocation | null) => {
    saveMyLocation(location);
    onDone();
  };
  const share = () => {
    if (!navigator.geolocation) return setStatus("Your browser can't share a location — pick your town instead.");
    setStatus("Finding you…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => choose({ label: "your location", lat: coords.latitude, lng: coords.longitude }),
      () => setStatus("Location wasn't shared — pick your town instead."),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  };

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="near-you-town">
          Your town or suburb
        </label>
        <input
          id="near-you-town"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Your town or suburb"
          autoComplete="off"
          className="w-56 rounded-sm border border-basalt/20 px-2 py-1 text-sm text-basalt"
        />
        <button type="button" onClick={share} className="text-seam-blue hover:underline">
          Use my location
        </button>
        {current && (
          <button type="button" onClick={() => choose(null)} className="text-slate hover:underline">
            Forget my town
          </button>
        )}
        <button type="button" onClick={onDone} className="text-slate hover:underline">
          Cancel
        </button>
      </div>
      {towns.length > 0 && (
        <ul className="max-w-sm divide-y divide-basalt/5 rounded-sm border border-basalt/10">
          {towns.map((t) => (
            <li key={t.label}>
              <button type="button" onClick={() => choose(t)} className="block w-full px-2 py-1.5 text-left text-sm text-basalt hover:bg-limestone">
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {status && <p>{status}</p>}
      <p className="text-[11px]">Remembered in this browser only — we don&apos;t store where you are.</p>
    </div>
  );
}
