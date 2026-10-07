"use client";

import { useState, useTransition } from "react";
import { newArrivalCode } from "@/app/account/bookings/actions";

/** Shows a fresh 6-digit arrival code on request. Each new code replaces the last, so only the one on screen works. */
export function ArrivalCode({ bookingId }: { bookingId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const reveal = () =>
    start(async () => {
      const result = await newArrivalCode(bookingId);
      setCode(result.code ?? null);
      setError(result.error ?? null);
    });
  return (
    <div className="rounded-sm border-2 border-seam-blue/30 bg-seam-blue/5 p-5">
      <h2 className="font-display text-lg font-semibold text-basalt">Arrival code</h2>
      <p className="mt-1 font-body text-sm text-slate">
        When the crew arrives on site, show them a code. Entering it starts the job — so only open it once they&apos;re actually there. Opening a new code cancels
        the previous one.
      </p>
      {code && (
        <p className="mt-4 font-mono text-4xl font-bold tracking-[0.3em] text-basalt" aria-live="polite" data-arrival-code>
          {code}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 font-body text-sm text-red-800">
          {error}
        </p>
      )}
      <button type="button" onClick={reveal} disabled={pending} className="mt-4 rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt disabled:opacity-50">
        {pending ? "Working…" : code ? "Show a new code" : "Show my arrival code"}
      </button>
    </div>
  );
}
