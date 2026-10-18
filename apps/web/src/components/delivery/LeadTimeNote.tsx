import { getLeadTimes } from "@/lib/cms";
import { leadTimeLabel } from "@/lib/phase4";

/**
 * The usual time from confirmation to delivery for a category, as staff set
 * it (Admin → Lead times). Nothing is shown when no lead time is set — none
 * is ever guessed.
 */
export async function LeadTimeNote({ categorySlug, className = "mt-3" }: { categorySlug: string; className?: string }) {
  const t = (await getLeadTimes()).get(categorySlug);
  if (!t) return null;
  return (
    <p className={`${className} rounded-sm border border-basalt/10 bg-white px-3 py-2 font-body text-xs text-basalt`}>
      <span className="font-mono text-[10px] uppercase text-slate">Usual lead time</span> · {leadTimeLabel(t)} from order confirmation
      {t.note ? <span className="text-slate"> — {t.note}</span> : null}. Large or phased orders are scheduled with you.
    </p>
  );
}
