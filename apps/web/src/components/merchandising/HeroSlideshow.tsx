"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export type SlideshowSlide = { id: string; url: string; alt: string; credit: string; caption: string; href?: string };

/**
 * Auto-playing photo slideshow directly below the hero banner: the
 * quarry-to-site story in licensed photography (data/media.ts), each slide
 * linking into the catalogue. Pauses on hover or keyboard focus, can be
 * paused outright (WCAG 2.2.2), and doesn't auto-advance for visitors who
 * prefer reduced motion.
 */
export function HeroSlideshow({ slides, intervalSeconds }: { slides: SlideshowSlide[]; intervalSeconds: number }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const running = slides.length > 1 && !paused && !hovered && !reducedMotion;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setActive((current) => (current + 1) % slides.length), intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [running, slides.length, intervalSeconds]);

  if (slides.length === 0) return null;
  const current = slides[Math.min(active, slides.length - 1)];
  const go = (index: number) => setActive((index + slides.length) % slides.length);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Aggregated Aggregates, from quarry to site"
      className="relative h-[300px] w-full overflow-hidden bg-basalt sm:h-[420px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {slides.map((slide, index) => (
        // eslint-disable-next-line @next/next/no-img-element -- licensed Unsplash CDN photography (data/media.ts)
        <img
          key={slide.id}
          src={slide.url}
          alt={index === active ? slide.alt : ""}
          aria-hidden={index !== active}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 motion-reduce:transition-none ${
            index === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-basalt/80 via-basalt/10 to-transparent" />

      <div className="absolute inset-x-0 bottom-12 mx-auto max-w-6xl px-4" aria-live={running ? "off" : "polite"}>
        <p className="font-mono text-[11px] uppercase tracking-widest text-ochre-gold">
          {String(active + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </p>
        {current.href ? (
          <Link href={current.href} className="mt-1 inline-block font-display text-xl font-bold text-limestone hover:text-ochre-gold sm:text-2xl">
            {current.caption} →
          </Link>
        ) : (
          <p className="mt-1 font-display text-xl font-bold text-limestone sm:text-2xl">{current.caption}</p>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-4 mx-auto flex max-w-6xl items-center gap-3 px-4">
        <button
          type="button"
          onClick={() => go(active - 1)}
          aria-label="Previous slide"
          className="rounded-sm px-1.5 font-mono text-sm text-limestone/80 hover:text-limestone"
        >
          ‹
        </button>
        <div className="flex gap-1.5">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show slide ${index + 1}: ${slide.caption}`}
              aria-current={index === active}
              onClick={() => go(index)}
              className={`h-1.5 w-5 rounded-full transition-colors ${index === active ? "bg-ochre-gold" : "bg-limestone/40 hover:bg-limestone/70"}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(active + 1)}
          aria-label="Next slide"
          className="rounded-sm px-1.5 font-mono text-sm text-limestone/80 hover:text-limestone"
        >
          ›
        </button>
        {slides.length > 1 && !reducedMotion && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="ml-1 rounded-sm border border-limestone/30 px-2 py-0.5 font-mono text-[10px] uppercase text-limestone/80 hover:text-limestone"
          >
            {paused ? "Play" : "Pause"}
          </button>
        )}
        <span className="ml-auto font-mono text-[10px] text-limestone/60">Photo: {current.credit}</span>
      </div>
    </section>
  );
}
