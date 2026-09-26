/**
 * The layered "strata" mark from the brand system: a Basalt tile with Seam
 * Blue courses widening towards the base and an Ochre Gold top layer.
 */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" rx="8" fill="#1C1B1A" />
      <rect x="16" y="9" width="8" height="3.5" rx="0.5" fill="#C08A34" />
      <rect x="14" y="14" width="12" height="3.5" rx="0.5" fill="#3E6A85" />
      <rect x="12" y="19" width="16" height="3.5" rx="0.5" fill="#3E6A85" />
      <rect x="10" y="24" width="20" height="3.5" rx="0.5" fill="#3E6A85" />
      <rect x="8" y="29" width="24" height="3.5" rx="0.5" fill="#3E6A85" />
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span
        className={`font-display text-base font-bold leading-none tracking-tight ${inverted ? "text-limestone" : "text-basalt"}`}
      >
        AGGREGATED
        <br />
        AGGREGATES
      </span>
    </span>
  );
}
