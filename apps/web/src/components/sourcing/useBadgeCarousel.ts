"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Carousel state shared by the full Responsible Sourcing carousel and the
 * homepage strip: calm autoplay that pauses on any manual move, arrow / Home
 * / End keys, swipe, and no autoplay for people who prefer reduced motion.
 */
export function useBadgeCarousel(count: number, intervalMs: number) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % count), intervalMs);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, count, intervalMs]);

  const move = (direction: number) => {
    setActive((value) => (value + direction + count) % count);
    setPaused(true);
  };
  const go = (index: number) => {
    setActive(index);
    setPaused(true);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "Home") { event.preventDefault(); go(0); }
    if (event.key === "End") { event.preventDefault(); go(count - 1); }
  };
  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    if (touchStartX.current === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > 48) move(delta > 0 ? -1 : 1);
  };

  return { active, paused, setPaused, reducedMotion, move, go, handlers: { onKeyDown, onTouchStart, onTouchEnd } };
}
