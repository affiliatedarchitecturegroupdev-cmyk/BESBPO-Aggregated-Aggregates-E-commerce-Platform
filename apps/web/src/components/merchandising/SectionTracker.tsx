"use client";

import { useEffect, useRef } from "react";

function send(slot: string, type: "impression" | "click") {
  const body = JSON.stringify({ slot, type });
  try {
    if (navigator.sendBeacon?.("/api/section-events", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/section-events", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
}

/**
 * Counts a merchandising section's views (a third of it on screen, once per visit) and clicks on the links in it
 * (docs/search-insights.md). Section names look like "home:best-sellers" or "collection:winter-ready". Only
 * anonymous counts leave the browser.
 */
export function SectionTracker({ slot, children, className }: { slot: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const key = `aa-section-seen-${slot}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // storage unavailable: still count, once per page
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          send(slot, "impression");
          try {
            sessionStorage.setItem(key, "1");
          } catch {
            // best effort
          }
          observer.disconnect();
        }
      },
      { threshold: 0.33 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [slot]);

  return (
    <div
      ref={ref}
      className={className}
      onClickCapture={(event) => {
        // Only following a link counts as a click — not scrolling the rail or opening a quick-add menu.
        if ((event.target as HTMLElement).closest?.("a[href]")) send(slot, "click");
      }}
    >
      {children}
    </div>
  );
}
