import Link from "next/link";
import { resolveImage, type Promotion } from "@/lib/promotions";

/**
 * One ad-system slot: staff-managed creative (Admin → Promotions) — sourced
 * photography with a headline, never a placeholder box. Renders nothing
 * when the slot is empty.
 */
export function PromoSlot({ promotion, className = "" }: { promotion?: Promotion; className?: string }) {
  const image = resolveImage(promotion?.imageUrl);
  if (!promotion || !image) return null;
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- licensed library or staff-supplied creative */}
      <img src={image.src} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
      <div className="absolute inset-0 flex items-end justify-between gap-4 bg-gradient-to-t from-basalt/85 via-basalt/30 to-transparent p-4">
        <span className="font-display text-base font-semibold text-limestone sm:text-lg">{promotion.title}</span>
        {promotion.linkUrl && <span className="shrink-0 font-mono text-[11px] uppercase text-ochre-gold">Shop now →</span>}
      </div>
    </>
  );
  const classes = `group relative block h-40 overflow-hidden rounded-sm border border-basalt/10 bg-basalt ${className}`;
  return promotion.linkUrl ? (
    <Link href={promotion.linkUrl} className={classes} aria-label={promotion.title} data-promo-slot={promotion.slot}>
      {inner}
    </Link>
  ) : (
    <div className={classes} data-promo-slot={promotion.slot}>
      {inner}
    </div>
  );
}
