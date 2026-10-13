"use client";

import { useRef, useState } from "react";
import { inputClass } from "@/components/account/Forms";
import { parseMapsInput } from "@/lib/maps-link";

const NOTE = {
  pin: "From the dropped pin — exact.",
  "map-centre": "From the centre of the map view, not a pin — zoom right in on the gate first, or drop a pin and copy that link.",
  typed: "From the coordinates you pasted.",
} as const;

/**
 * Fills the latitude/longitude boxes from a Google Maps link or pasted
 * coordinates, so pinning a supplier is: find the gate on Google Maps, copy,
 * paste here, check, save.
 */
export function MapsLinkPaste() {
  const ref = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string; check?: string } | null>(null);

  function read(value: string) {
    const parsed = parseMapsInput(value);
    if (!parsed) return setMessage(null);
    if ("error" in parsed) return setMessage({ ok: false, text: parsed.error });
    const form = ref.current?.closest("form");
    const set = (name: string, v: number) => {
      const input = form?.elements.namedItem(name) as HTMLInputElement | null;
      if (input) input.value = String(v);
    };
    set("latitude", parsed.latitude);
    set("longitude", parsed.longitude);
    setMessage({
      ok: true,
      text: `Set to ${parsed.latitude}, ${parsed.longitude}. ${NOTE[parsed.precision]}`,
      check: `https://www.google.com/maps/search/?api=1&query=${parsed.latitude},${parsed.longitude}`,
    });
  }

  return (
    <div ref={ref} className="sm:col-span-2">
      <label className="block">
        <span className="font-mono text-[10px] uppercase text-slate">Paste a Google Maps link or coordinates</span>
        <input
          type="text"
          onChange={(e) => read(e.target.value)}
          placeholder="https://www.google.com/maps/place/…  or  -25.90925, 28.00078"
          className={inputClass}
        />
      </label>
      <p className="mt-1 font-body text-[11px] text-slate">
        On Google Maps, right-click the yard or quarry gate and click the coordinates to copy them, or drop a pin and copy the link.
      </p>
      {message && (
        <p className={`mt-1 font-body text-xs ${message.ok ? "text-emerald-700" : "text-red-700"}`}>
          {message.text}{" "}
          {message.check && (
            <a href={message.check} target="_blank" rel="noopener noreferrer" className="underline">
              Check on the map ↗
            </a>
          )}
        </p>
      )}
    </div>
  );
}
