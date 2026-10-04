"use client";

import { ArrowLeft, ArrowRight, CircleCheck, ExternalLink, Pause, Play, ShieldCheck } from "lucide-react";
import { useRef } from "react";
import { SOURCING_BADGES } from "@/data/badges";
import { BadgeMark } from "./BadgeMark";
import { useBadgeCarousel } from "./useBadgeCarousel";

/**
 * The Responsible Sourcing badge carousel: a colour panel with the badge on
 * the left, what it means and what we expect of partners on the right,
 * autoplay every 6.4s with pause/play, arrows, progress tabs, keyboard and
 * swipe. Built after the AggregateTrust prototype.
 */
export function BadgeCarousel() {
  const badges = SOURCING_BADGES;
  const { active, paused, setPaused, move, go, handlers } = useBadgeCarousel(badges.length, 6400);
  const ref = useRef<HTMLDivElement>(null);
  const current = badges[active];

  return (
    <div>
      <div
        ref={ref}
        tabIndex={0}
        {...handlers}
        aria-roledescription="carousel"
        aria-label="Responsible sourcing badges"
        className="overflow-hidden rounded-[28px] bg-basalt text-limestone shadow-2xl shadow-basalt/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ochre-gold focus-visible:ring-offset-4 focus-visible:ring-offset-limestone"
      >
        <div className="grid lg:grid-cols-[.72fr_1.28fr]">
          <div className="flex min-h-[340px] flex-col justify-between p-7 transition-colors duration-500 lg:p-12" style={{ backgroundColor: current.accent }}>
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/35 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.18em]">Badge</span>
              <span className="font-mono text-xs text-white/75">
                {String(active + 1).padStart(2, "0")} / {String(badges.length).padStart(2, "0")}
              </span>
            </div>
            <div className="mt-10 flex flex-1 items-center justify-center">
              <BadgeMark badge={current} className="h-44 w-full max-w-[300px] rounded-[24px] p-7 shadow-2xl" imgClassName="max-h-28" />
            </div>
            <div className="mt-10 font-mono text-[9px] uppercase tracking-[0.17em] text-white/75">What we expect of our suppliers · not our certification</div>
          </div>

          <div className="p-7 lg:p-12" aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ochre-gold">{current.eyebrow}</p>
                <h3 className="mt-4 font-display text-4xl font-bold tracking-tight md:text-5xl">{current.name}</h3>
                <p className="mt-2 font-body text-xs text-limestone/60">{current.fullName}</p>
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.16em] text-limestone/50">Scope / {current.scope}</p>
              </div>
              <a
                href={current.source}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-white/20 p-3 text-limestone/70 transition hover:border-ochre-gold hover:text-ochre-gold"
                aria-label={`Open the ${current.name} website`}
              >
                <ExternalLink size={17} />
              </a>
            </div>
            <p className="mt-7 max-w-xl font-body text-base leading-7 text-limestone/75 md:text-lg md:leading-8">{current.description}</p>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ochre-gold">
                  <CircleCheck size={13} /> What we expect of partners
                </div>
                <p className="mt-3 font-body text-sm leading-6 text-limestone/70">{current.expect}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ochre-gold">
                  <ShieldCheck size={13} /> How we use this badge
                </div>
                <p className="mt-3 font-body text-sm leading-6 text-limestone/70">{current.rule}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-5 border-t border-white/10 pt-6">
              <a href={current.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ochre-gold hover:text-limestone">
                {current.sourceLabel} <ExternalLink size={14} />
              </a>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => move(-1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-ochre-gold hover:text-ochre-gold" aria-label="Previous badge">
                  <ArrowLeft size={16} />
                </button>
                <button type="button" onClick={() => move(1)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-ochre-gold hover:text-ochre-gold" aria-label="Next badge">
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaused((value) => !value);
                    ref.current?.focus();
                  }}
                  className="ml-2 inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 font-mono text-[9px] font-bold uppercase tracking-[0.15em] transition hover:border-ochre-gold hover:text-ochre-gold"
                  aria-label={paused ? "Resume autoplay" : "Pause autoplay"}
                >
                  {paused ? <Play size={13} /> : <Pause size={13} />}
                  {paused ? "Play" : "Pause"}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1 border-t border-white/10 px-7 py-5 lg:px-12" role="tablist" aria-label="Badges">
          {badges.map((badge, index) => (
            <button
              key={badge.key}
              type="button"
              onClick={() => go(index)}
              className={`h-1.5 flex-1 rounded-full transition-colors ${index === active ? "bg-ochre-gold" : "bg-white/15 hover:bg-white/35"}`}
              aria-label={`Show ${badge.name}`}
              aria-selected={index === active}
              role="tab"
            />
          ))}
        </div>
      </div>
      <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.15em] text-slate">
        Moves every 6 seconds · arrow keys, Home and End work · pauses when you take control
      </p>
    </div>
  );
}
