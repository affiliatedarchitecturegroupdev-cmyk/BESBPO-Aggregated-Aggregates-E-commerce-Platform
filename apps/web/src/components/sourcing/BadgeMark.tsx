import type { SourcingBadge } from "@/data/badges";

/** A badge's logo on its shell colour — or, while the official file is still to come, its name set as a text tile. */
export function BadgeMark({ badge, className = "", imgClassName = "" }: { badge: SourcingBadge; className?: string; imgClassName?: string }) {
  return (
    <div className={`grid place-items-center ${className}`} style={{ backgroundColor: badge.logoShell }}>
      {badge.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- badge file (RESPONSIBLE_SOURCING.md)
        <img src={badge.logo} alt={`${badge.name} badge`} className={`w-full object-contain ${imgClassName}`} />
      ) : (
        <span role="img" aria-label={`${badge.name} badge`} className="text-center">
          <span className="block font-display text-3xl font-bold tracking-tight text-[#165c78]">{badge.name}</span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.14em] text-slate">{badge.fullName}</span>
        </span>
      )}
    </div>
  );
}
