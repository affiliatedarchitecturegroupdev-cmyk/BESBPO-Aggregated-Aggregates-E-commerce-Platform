"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { CoverageTown } from "@/data/coverage-towns";

/**
 * Leaflet map of the towns we deliver to. Tiles come from
 * NEXT_PUBLIC_MAP_TILE_URL (default: OpenStreetMap's standard tiles, which
 * need the attribution shown). Markers are vector circles sized by tier, so
 * no marker images are needed.
 */
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Towns: <a href="https://www.geonames.org">GeoNames</a> (CC BY 4.0)';
const SA_BOUNDS: [[number, number], [number, number]] = [[-34.9, 16.4], [-22.1, 32.9]];
const RADIUS = { metro: 9, city: 7, town: 5 } as const;

export function CoverageMap({ towns, selected, onSelect }: { towns: CoverageTown[]; selected: CoverageTown | null; onSelect: (town: CoverageTown) => void }) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<import("leaflet").Map | null>(null);
  const markers = useRef(new Map<string, import("leaflet").CircleMarker>());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !element.current || map.current) return;
      const m = L.map(element.current, { scrollWheelZoom: false, zoomSnap: 0.5 }).fitBounds(SA_BOUNDS);
      L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18 }).addTo(m);
      for (const town of towns) {
        const marker = L.circleMarker([town.lat, town.lng], {
          radius: RADIUS[town.tier],
          color: "#ffffff",
          weight: 1.5,
          fillColor: town.tier === "metro" ? "#C8963E" : "#2C4A5E",
          fillOpacity: 0.9,
        })
          .bindTooltip(`${town.name}, ${town.province}`, { direction: "top", offset: [0, -4] })
          .on("click", () => onSelectRef.current(town))
          .addTo(m);
        markers.current.set(key(town), marker);
      }
      map.current = m;
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      markers.current.clear();
    };
  }, [towns]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const [k, marker] of markers.current) {
      const on = selected !== null && k === key(selected);
      marker.setStyle({ color: on ? "#C8963E" : "#ffffff", weight: on ? 4 : 1.5 });
      if (on) marker.bringToFront();
    }
    if (selected) m.flyTo([selected.lat, selected.lng], 10, { duration: 0.8 });
  }, [selected]);

  return <div ref={element} role="region" aria-label="Map of towns we deliver to" className="h-[420px] w-full rounded-sm border border-basalt/10 bg-limestone sm:h-[520px]" />;
}

const key = (t: CoverageTown) => `${t.province}|${t.name}`;
