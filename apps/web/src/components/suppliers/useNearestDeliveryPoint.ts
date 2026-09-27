"use client";

import { useCallback, useState } from "react";
import type { NearestDeliveryPoint } from "@/lib/suppliers";

export type NearestState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "found"; town: string; province: string; distanceKm: number }
  | { status: "none" }
  | { status: "error"; message: string };

const GEOLOCATION_ERRORS: Record<number, string> = {
  1: "Location access was blocked. Allow it in your browser, or enter the distance yourself.",
  2: "Your location isn't available right now. Enter the distance yourself.",
  3: "Finding your location took too long. Try again, or enter the distance yourself.",
};

/**
 * Asks the browser for the visitor's location and finds the nearest partner
 * delivery point that supplies the category. Only the distance comes back;
 * the location isn't stored.
 */
export function useNearestDeliveryPoint() {
  const [state, setState] = useState<NearestState>({ status: "idle" });

  const locate = useCallback((category?: string): Promise<NearestState> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      const next: NearestState = { status: "error", message: "Your browser can't share a location. Enter the distance yourself." };
      setState(next);
      return Promise.resolve(next);
    }
    setState({ status: "locating" });
    return new Promise((resolve) => {
      const finish = (next: NearestState) => {
        setState(next);
        resolve(next);
      };
      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          const search = new URLSearchParams({ lat: String(coords.latitude), lng: String(coords.longitude) });
          if (category) search.set("category", category);
          try {
            const response = await fetch(`/api/delivery-points/nearest?${search}`, { cache: "no-store" });
            if (!response.ok) throw new Error();
            const point = (await response.json()) as NearestDeliveryPoint;
            finish(point.found ? { status: "found", town: point.town, province: point.province, distanceKm: point.distanceKm } : { status: "none" });
          } catch {
            finish({ status: "error", message: "We couldn't look up delivery points just now. Enter the distance yourself." });
          }
        },
        (error) => finish({ status: "error", message: GEOLOCATION_ERRORS[error.code] ?? GEOLOCATION_ERRORS[2] }),
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
      );
    });
  }, []);

  return { state, locate };
}
