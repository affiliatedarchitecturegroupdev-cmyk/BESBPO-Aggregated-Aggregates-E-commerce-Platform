"use client";

import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { SOURCING_BADGES } from "@/data/badges";
import { BadgeMark } from "./BadgeMark";
import { useBadgeCarousel } from "./useBadgeCarousel";

/**
 * The homepage strip: a smaller version of the Responsible Sourcing
 * carousel — one badge at a time with its scope, the rest as a row of
 * thumbnails — and the shortcut to the full page.
 */
export function BadgeCarouselCompact() {
  const badges = SOURCING_BADGES;
  const { active, paused, setPaused, move, go, handlers } = useBadgeCarousel(badges.length, 5000);
  const current = badges[active];

  return (
    <section aria-labelledby="sourcing-heading" className="border-y border-basalt/10 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">Responsible Sourcing</p>
          <h2 id="sourcing-heading" className="mt-1 font-display text-2xl font-bold text-basalt">The standards we hold our suppliers to</h2>
          <p className="mt-2 max-w-md font-body text-sm text-slate">
            Before a quarry or plant supplies you through us, we check it against the bodies that govern South African materials — standards, accreditation,
            industry and supplier credentials.
          </p>
          <Link href="/responsible-sourcing" className="mt-5 inline-flex items-center gap-2 rounded-sm bg-basalt px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-seam-blue">
            How we source responsibly <ArrowRight size={15} />
          </Link>
        </div>

        <div
          tabIndex={0}
          {...handlers}
          aria-roledescription="carousel"
          aria-label="Responsible sourcing badges"
          className="overflow-hidden rounded-[20px] bg-basalt text-limestone focus:outline-none focus-visible:ring-2 focus-visible:ring-ochre-gold focus-visible:ring-offset-2"
        >
          <div className="grid grid-cols-[auto_1fr] items-stretch" aria-live="polite">
            <div className="flex w-36 items-center justify-center p-4 transition-colors duration-500 sm:w-48" style={{ backgroundColor: current.accent }}>
              <BadgeMark badge={current} className="h-24 w-full rounded-[14px] p-3 shadow-xl sm:h-28" imgClassName="max-h-16 sm:max-h-20" />
            </div>
            <div className="min-w-0 p-5">
              <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-ochre-gold">{current.eyebrow}</p>
              <p className="mt-2 font-display text-xl font-bold">{current.name}</p>
              <p className="mt-1 line-clamp-2 font-body text-xs text-limestone/70">{current.fullName}</p>
              <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-limestone/50">Scope / {current.scope}</p>
              <div className="mt-3 flex items-center gap-1.5">
                <button type="button" onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 hover:border-ochre-gold hover:text-ochre-gold" aria-label="Previous badge">
                  <ArrowLeft size={14} />
                </button>
                <button type="button" onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 hover:border-ochre-gold hover:text-ochre-gold" aria-label="Next badge">
                  <ArrowRight size={14} />
                </button>
                <button type="button" onClick={() => setPaused((p) => !p)} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 hover:border-ochre-gold hover:text-ochre-gold" aria-label={paused ? "Resume autoplay" : "Pause autoplay"}>
                  {paused ? <Play size={13} /> : <Pause size={13} />}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-1.5 overflow-x-auto border-t border-white/10 p-3" role="tablist" aria-label="Badges">
            {badges.map((badge, index) => (
              <button
                key={badge.key}
                type="button"
                role="tab"
                aria-selected={index === active}
                aria-label={`Show ${badge.name}`}
                onClick={() => go(index)}
                className={`shrink-0 rounded-md p-0.5 transition ${index === active ? "ring-2 ring-ochre-gold" : "opacity-60 hover:opacity-100"}`}
              >
                <BadgeMark badge={badge} className="h-9 w-14 rounded p-1 [&_span_span:last-child]:hidden [&_span_span]:text-[10px]" imgClassName="max-h-7" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
