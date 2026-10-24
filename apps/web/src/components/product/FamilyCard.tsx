import Link from "next/link";
import { ProductThumb } from "@/components/product/ProductThumb";
import type { FamilyView, IndexedProduct } from "@/lib/product-index";
import { formatZAR } from "@/lib/pricing";

/** How many size chips a card shows before "+N more". */
const CHIPS = 6;

/**
 * One card for a family of sizes (docs/product-families.md). Written for shoppers who never touch a filter: it
 * says plainly how many sizes there are and lists them as tappable chips, so nobody assumes we don't stock theirs.
 * Each chip goes straight to that size's own page; the card itself to the first matching size.
 */
export function FamilyCard({ family, shown }: { family: FamilyView; shown: IndexedProduct[] }) {
  const first = shown[0];
  const href = `/products/${first.slug}`;
  const shownSkus = new Set(shown.map((s) => s.sku));
  // Matching sizes first (in result order), then the rest of the family.
  const ordered = [...family.members.filter((m) => shownSkus.has(m.sku)).sort((a, b) => shown.findIndex((s) => s.sku === a.sku) - shown.findIndex((s) => s.sku === b.sku)), ...family.members.filter((m) => !shownSkus.has(m.sku))];
  const chips = ordered.slice(0, CHIPS);
  const more = family.members.length - chips.length;
  const online = family.buyOnline > 0;
  return (
    <div className="group flex flex-col rounded-sm border border-basalt/10 bg-white p-4 transition hover:border-seam-blue hover:shadow-sm">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block">
        <ProductThumb sku={first.sku} categorySlug={first.categorySlug} name={family.title} />
        <span className={`absolute left-2 top-2 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${online ? "bg-seam-blue text-limestone" : "bg-limestone text-basalt ring-1 ring-basalt/20"}`}>
          {online ? (family.buyOnline === family.members.length ? "Buy online" : `${family.buyOnline} buy online`) : "Quote"}
        </span>
        <span className="absolute right-2 top-2 rounded-sm bg-ochre-gold px-2 py-0.5 font-mono text-[10px] font-semibold text-basalt">{family.members.length} sizes</span>
      </Link>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-slate">{first.categoryName}</p>
      <Link href={href} className="mt-0.5 font-body text-sm font-semibold text-basalt hover:text-seam-blue">
        {family.title}
      </Link>
      <p className="font-body text-xs text-slate">Available in {family.members.length} sizes — pick yours:</p>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`${family.title} sizes`}>
        {chips.map((m) => (
          <li key={m.sku}>
            <Link href={`/products/${m.slug}`} className="block rounded-sm border border-basalt/15 px-2 py-1 font-body text-[11px] text-basalt hover:border-seam-blue hover:text-seam-blue">
              {m.variant}
            </Link>
          </li>
        ))}
        {more > 0 && (
          <li>
            <Link href={`${href}#sizes`} className="block rounded-sm px-2 py-1 font-body text-[11px] font-semibold text-seam-blue hover:underline">
              +{more} more
            </Link>
          </li>
        )}
      </ul>
      <p className="mt-3 flex-1 font-body text-sm text-basalt">
        {family.fromPrice !== null ? (
          <>
            <span className="text-xs text-slate">From </span>
            <span className="font-semibold">{formatZAR(family.fromPrice)}</span>
            <span className="text-xs text-slate"> / {family.fromUnit}</span>
          </>
        ) : (
          <span className="text-xs text-slate">Price on request — we confirm a supplier price on a quote</span>
        )}
      </p>
      <Link href={`${href}#sizes`} className="mt-3 self-start rounded-sm border border-basalt/20 px-3 py-1.5 font-body text-xs font-semibold text-basalt hover:border-seam-blue">
        See all {family.members.length} sizes
      </Link>
    </div>
  );
}
