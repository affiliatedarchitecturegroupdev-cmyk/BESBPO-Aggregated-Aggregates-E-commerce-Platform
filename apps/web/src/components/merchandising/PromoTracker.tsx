"use client";

import { useEffect, useRef } from "react";

function send(id: string, type: "impression" | "click") {
  const body = JSON.stringify({ id, type });
  try {
    if (navigator.sendBeacon?.("/api/promo-events", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/promo-events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
}

/**
 * Counts a promotion's impressions (at least half the banner on screen,
 * once per visit) and clicks. Only anonymous counts leave the browser.
 */
export function PromoTracker({ promotionId, children }: { promotionId: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const key = `aa-promo-seen-${promotionId}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // storage unavailable: still count, once per page
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          send(promotionId, "impression");
          try {
            sessionStorage.setItem(key, "1");
          } catch {
            // best effort
          }
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [promotionId]);

  return (
    <div ref={ref} onClickCapture={() => send(promotionId, "click")}>
      {children}
    </div>
  );
}
