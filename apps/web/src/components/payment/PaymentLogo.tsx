import type { PaymentMethod } from "@/data/payment-methods";

const SIZE = {
  sm: { badge: "h-7 gap-1.5 px-2", img: "h-4", fill: "h-6" },
  md: { badge: "h-9 gap-2 px-2.5", img: "h-5", fill: "h-8" },
} as const;

/**
 * A payment method's brand mark(s) on a white badge, so official logos (many
 * are black or dark) read the same on the dark footer as on white cards.
 * Card shows its three networks side by side (see PAYMENT_ASSETS.md).
 */
export function PaymentLogo({ method, size = "sm", decorative = false }: { method: PaymentMethod; size?: keyof typeof SIZE; decorative?: boolean }) {
  const s = SIZE[size];
  const paths = [method.logoAssetPath, ...(method.extraLogoPaths ?? [])];
  return (
    <span className={`inline-flex shrink-0 items-center rounded-sm border border-basalt/10 bg-white ${s.badge}`}>
      {paths.map((path, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- provider logo (see PAYMENT_ASSETS.md)
        <img
          key={path}
          src={`/payment-logos/${path}`}
          alt={decorative || i > 0 ? "" : method.displayName}
          className={`${method.logoFill ? s.fill : s.img} w-auto max-w-[6rem] object-contain`}
        />
      ))}
    </span>
  );
}
