"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "aa-cookie-consent";

/** For future analytics/marketing scripts: only load after an explicit "accepted". */
export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

/**
 * POPIA-oriented cookie-consent banner, linking to the cookie policy. The
 * choice is kept in localStorage; any analytics or marketing script added
 * later must check hasAnalyticsConsent() before loading. The site sets no
 * non-essential cookies today.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      // localStorage unavailable (private browsing, etc.) — fail open, don't block rendering
      setVisible(true);
    }
  }, []);

  const respond = (choice: "accepted" | "rejected") => {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // best-effort only
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div role="region" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-50 border-t border-basalt/10 bg-basalt px-4 py-4 text-limestone">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <p className="font-body text-xs text-limestone/80">
          We use cookies for essential site function and, with your consent, analytics. See our{" "}
          <a href="/legal/cookie-policy" className="text-ochre-gold hover:underline">
            Cookie Policy
          </a>{" "}
          for details.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => respond("rejected")}
            className="rounded-sm border border-limestone/30 px-4 py-2 font-body text-xs text-limestone hover:bg-limestone/10"
          >
            Reject Non-Essential
          </button>
          <button
            type="button"
            onClick={() => respond("accepted")}
            className="rounded-sm bg-ochre-gold px-4 py-2 font-body text-xs font-semibold text-basalt hover:bg-limestone"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
