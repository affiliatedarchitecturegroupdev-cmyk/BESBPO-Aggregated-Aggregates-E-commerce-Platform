import { CompleteTheJobPanel } from "@/components/merchandising/CompleteTheJobPanel";
import { bestWith, type BestWithSuggestion } from "@/data/complete-the-job";
import { apiCached } from "@/lib/api";
import { getHiddenSkus } from "@/lib/cms";

/**
 * Best With (docs/best-with.md) and Complete the job (COMPLETE_THE_JOB.md):
 * what customers buy with this product and staff's pins first, then what
 * else the job it belongs to needs, from any line.
 */
export async function CompleteTheJob({ sku, categorySlug }: { sku: string; categorySlug: string }) {
  const suggestions = (await apiCached<BestWithSuggestion[]>(`/merchandising/best-with?skus=${encodeURIComponent(sku)}`, 3600, ["best-with"])) ?? [];
  const job = bestWith(sku, categorySlug, await getHiddenSkus(), Array.isArray(suggestions) ? suggestions : []);
  if (!job) return null;
  return (
    <section aria-labelledby="complete-the-job" className="mt-16 rounded-sm border border-basalt/10 bg-limestone/60 p-5 md:p-6">
      <CompleteTheJobPanel job={job} />
    </section>
  );
}
