import Link from "next/link";
import { StageShop } from "@/components/merchandising/StageShop";
import { buildStageShop } from "@/data/build-stages";

/** Shop by Build Stage (BUILD_STAGES.md): the range arranged the way a job is built. */
export function ShopByStage({ hiddenSkus = [], heading = true }: { hiddenSkus?: string[]; heading?: boolean }) {
  const stages = buildStageShop(hiddenSkus);
  return (
    <section aria-labelledby={heading ? "shop-by-stage" : undefined} className="border-y border-basalt/10 bg-limestone/60">
      <div className="mx-auto max-w-6xl px-4 py-16">
        {heading && (
          <div className="mb-6">
            <div className="flex items-baseline justify-between gap-4">
              <h2 id="shop-by-stage" className="font-display text-2xl font-bold text-basalt">Shop by Build Stage</h2>
              <Link href="/shop-by-stage" className="shrink-0 font-body text-sm text-seam-blue hover:underline">Shop by stage page →</Link>
            </div>
            <p className="mt-1 max-w-3xl font-body text-sm text-slate">
              What goes into each stage of the job, from site prep to landscaping — the materials, the plant and the services — and one click to save
              a stage to your project list.
            </p>
          </div>
        )}
        <StageShop stages={stages} />
      </div>
    </section>
  );
}
