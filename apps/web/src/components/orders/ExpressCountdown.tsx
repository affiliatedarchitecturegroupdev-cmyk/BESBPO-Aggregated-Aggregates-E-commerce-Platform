"use client";

import { useEffect, useState } from "react";
import { formatTimeZA } from "@/lib/account-types";

const fmt = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min` : `${m} min`;
};

/**
 * AA 60/120: time left until the order is due, then how late it is and
 * when the fee becomes refundable. Ticks every 30 seconds.
 */
export function ExpressCountdown({ clockStartsAt, dueAt, refundAfter, compact = false }: { clockStartsAt: string; dueAt: string; refundAfter: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const start = new Date(clockStartsAt).getTime();
  const due = new Date(dueAt).getTime();
  const refund = new Date(refundAfter).getTime();
  // Before hydration, show the fixed times only (no clock mismatch between server and browser).
  if (now === null) return <span className="tabular-nums">Due by {formatTimeZA(dueAt)}</span>;

  let text: string;
  let tone: string;
  if (now < start) {
    text = `Loading prep — clock starts at ${formatTimeZA(clockStartsAt)} (in ${fmt(start - now)}); due by ${formatTimeZA(dueAt)}`;
    tone = "text-seam-blue";
  } else if (now <= due) {
    text = `${fmt(due - now)} left — due by ${formatTimeZA(dueAt)}`;
    tone = due - now < 30 * 60000 ? "text-ochre-gold" : "text-seam-blue";
  } else if (now <= refund) {
    text = `${fmt(now - due)} late — express fee refundable from ${formatTimeZA(refundAfter)}`;
    tone = "text-ochre-gold";
  } else {
    text = `More than an hour late — the express fee is refundable`;
    tone = "text-red-700";
  }
  return (
    <span className={`tabular-nums font-semibold ${tone}`} role="timer" aria-live="off">
      {compact ? text.split(" — ")[0] : text}
    </span>
  );
}
