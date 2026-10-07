"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BUSINESS_LINES, lineImage } from "@/data/business-lines";

const AUTOPLAY_MS = 6500;

/**
 * The platform's business lines as a slider: autoplay that pauses on hover or
 * focus and respects reduced motion, arrows, dots and keyboard arrows.
 */
export function BusinessLinesCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = BUSINESS_LINES.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || reducedMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="What we do"
      className="relative overflow-hidden bg-basalt"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className="flex transition-transform duration-700 ease-out motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
        {BUSINESS_LINES.map((line, i) => {
          const image = lineImage(line);
          return (
            <div
              key={line.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}: ${line.title}`}
              aria-hidden={i !== index}
              className="relative h-[440px] w-full shrink-0 md:h-[480px]"
            >
              {image && (
                // eslint-disable-next-line @next/next/no-img-element -- licensed photo from data/media.ts
                <img src={image.url} alt={image.alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-basalt/95 via-basalt/70 to-basalt/20 md:via-basalt/55 md:to-transparent" />
              <div className="relative mx-auto flex h-full max-w-6xl items-center px-12 md:px-16">
                <div className="max-w-xl text-limestone">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-ochre-gold">{line.tagline}</span>
                  <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">{line.title}</h2>
                  <p className="mt-4 font-body text-sm text-limestone/85 md:text-base">{line.description}</p>
                  <Link
                    href={line.href}
                    tabIndex={i === index ? 0 : -1}
                    className="mt-6 inline-block rounded-sm bg-ochre-gold px-6 py-3 font-body text-sm font-semibold text-basalt hover:bg-limestone"
                  >
                    {line.cta} →
                  </Link>
                </div>
              </div>
              {image && <span className="absolute bottom-3 right-4 font-mono text-[10px] text-limestone/60">Photo: {image.credit}</span>}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="Previous"
        onClick={() => go(index - 1)}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-basalt/60 px-3 py-2 font-mono text-lg text-limestone hover:bg-basalt md:left-4"
      >
        ‹
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => go(index + 1)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-basalt/60 px-3 py-2 font-mono text-lg text-limestone hover:bg-basalt md:right-4"
      >
        ›
      </button>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Choose a business line">
        {BUSINESS_LINES.map((line, i) => (
          <button
            key={line.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={line.title}
            onClick={() => go(i)}
            className={`h-1.5 w-6 rounded-full transition-colors md:w-8 ${i === index ? "bg-ochre-gold" : "bg-limestone/40 hover:bg-limestone/70"}`}
          />
        ))}
      </div>
    </section>
  );
}
