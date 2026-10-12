"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** After returning from PayFast: re-check the order every few seconds (for about a minute) until its payment notification has arrived. */
export function RefreshWhilePending({ seconds = 5, times = 12 }: { seconds?: number; times?: number }) {
  const router = useRouter();
  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      if (count > times) clearInterval(timer);
      else router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds, times]);
  return null;
}
