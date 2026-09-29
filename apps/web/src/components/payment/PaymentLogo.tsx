import type { PaymentMethod } from "@/data/payment-methods";

const SIZE = {
  sm: { badge: "h-7 gap-1 px-2", img: "h-4", label: "text-xs" },
  md: { badge: "h-9 gap-1.5 px-2.5", img: "h-5", label: "text-sm" },
} as const;

/**
 * A payment method's brand mark on a white badge, so official logos (many
 * are black or dark) read the same on the dark footer as on white cards.
 * `logoLabel` sets e.g. "Pay" beside a parent-brand mark (see PAYMENT_ASSETS.md).
 */
export function PaymentLogo({ method, size = "sm", decorative = false }: { method: PaymentMethod; size?: keyof typeof SIZE; decorative?: boolean }) {
  const s = SIZE[size];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-sm border ${method.logoOnDark ? "border-white/20 bg-[#1d1d1f]" : "border-basalt/10 bg-white"} ${s.badge}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- provider logo (see PAYMENT_ASSETS.md) */}
      <img src={`/payment-logos/${method.logoAssetPath}`} alt={decorative ? "" : method.displayName} className={`${s.img} w-auto max-w-[6rem] object-contain`} />
      {method.logoLabel && (
        <span className={`font-body font-semibold leading-none text-[#1d1d1f] ${s.label}`} aria-hidden="true">
          {method.logoLabel}
        </span>
      )}
    </span>
  );
}
