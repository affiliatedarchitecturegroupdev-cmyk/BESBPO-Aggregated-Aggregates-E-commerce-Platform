import { CompleteTheJobPanel } from "@/components/merchandising/CompleteTheJobPanel";
import { completeTheJob } from "@/data/complete-the-job";
import { getHiddenSkus } from "@/lib/cms";

/** Complete the job (COMPLETE_THE_JOB.md): what else the job this product belongs to needs, from any line. */
export async function CompleteTheJob({ sku, categorySlug }: { sku: string; categorySlug: string }) {
  const job = completeTheJob(sku, categorySlug, await getHiddenSkus());
  if (!job) return null;
  return (
    <section aria-labelledby="complete-the-job" className="mt-16 rounded-sm border border-basalt/10 bg-limestone/60 p-5 md:p-6">
      <CompleteTheJobPanel job={job} />
    </section>
  );
}
