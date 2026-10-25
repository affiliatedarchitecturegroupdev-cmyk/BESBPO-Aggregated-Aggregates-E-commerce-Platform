"use client";

import { useEffect, useState } from "react";

/**
 * The shopper's chosen town or shared location, for "Available near you" (docs/availability.md). Kept only in
 * this browser's local storage (Cookie Policy) — never sent to us except as the coordinates of a lookup, which
 * aren't stored. Shared location is rounded to about a kilometre before it's kept.
 */
export type MyLocation = { label: string; lat: number; lng: number };

const KEY = "aa-my-location";
const EVENT = "aa-my-location-change";

export function readMyLocation(): MyLocation | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null") as MyLocation | null;
    return value && typeof value.lat === "number" && typeof value.lng === "number" && typeof value.label === "string" ? value : null;
  } catch {
    return null;
  }
}

export function saveMyLocation(location: MyLocation | null) {
  try {
    if (location) localStorage.setItem(KEY, JSON.stringify({ label: location.label.slice(0, 80), lat: Math.round(location.lat * 100) / 100, lng: Math.round(location.lng * 100) / 100 }));
    else localStorage.removeItem(KEY);
  } catch {
    // storage unavailable: it just isn't remembered
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The saved location, kept in step across components and tabs. Undefined until the browser has been read. */
export function useMyLocation(): MyLocation | null | undefined {
  const [location, setLocation] = useState<MyLocation | null | undefined>(undefined);
  useEffect(() => {
    const update = () => setLocation(readMyLocation());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return location;
}
