import { saveLeadTimes } from "@/app/admin/deliveries/actions";
import { ActionForm, inputClass, SubmitButton } from "@/components/account/Forms";
import { CATEGORIES } from "@/data/categories";
import { api } from "@/lib/api";
import type { LeadTime } from "@/lib/phase4";
import { sessionToken } from "@/lib/session";

export const metadata = { title: "Lead times" };

/**
 * Staff: the usual time from order confirmation to delivery, per category,
 * in working days (docs/lead-times.md). Shown on product pages, the cart,
 * checkout and the order confirmation — only for categories set here. Leave a
 * row blank to show nothing; we never show a guessed lead time.
 */
export default async function LeadTimesPage() {
  const content = await api<{ "lead-times"?: { items: LeadTime[] } }>("/content", { token: sessionToken() });
  const saved = new Map((content.ok ? (content.data["lead-times"]?.items ?? []) : []).map((t) => [t.categorySlug, t]));
  return (
    <section className="rounded-sm border border-basalt/10 bg-white p-5">
      <h2 className="font-body text-sm font-semibold text-basalt">Lead times (working days from confirmation)</h2>
      <p className="mt-1 font-body text-xs text-slate">Set them from what partner suppliers have confirmed. Blank rows show nothing to customers.</p>
      <ActionForm action={saveLeadTimes} className="mt-4 space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left font-body text-xs">
            <thead className="text-slate"><tr><th className="py-1 font-normal">Category</th><th className="py-1 font-normal">Shortest</th><th className="py-1 font-normal">Longest</th><th className="py-1 font-normal">Note shown to customers</th></tr></thead>
            <tbody className="divide-y divide-basalt/5">
              {CATEGORIES.map((c) => {
                const t = saved.get(c.slug);
                return (
                  <tr key={c.slug}>
                    <td className="py-1.5 pr-3">{c.name}<input type="hidden" name="categorySlug" value={c.slug} /></td>
                    <td className="py-1.5 pr-3"><input name="minDays" type="number" min={0} max={60} defaultValue={t?.minDays ?? ""} className={`${inputClass} mt-0 w-20`} aria-label={`${c.name} shortest`} /></td>
                    <td className="py-1.5 pr-3"><input name="maxDays" type="number" min={0} max={90} defaultValue={t?.maxDays ?? ""} className={`${inputClass} mt-0 w-20`} aria-label={`${c.name} longest`} /></td>
                    <td className="py-1.5"><input name="note" maxLength={160} defaultValue={t?.note ?? ""} className={`${inputClass} mt-0`} aria-label={`${c.name} note`} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SubmitButton>Save lead times</SubmitButton>
      </ActionForm>
    </section>
  );
}
