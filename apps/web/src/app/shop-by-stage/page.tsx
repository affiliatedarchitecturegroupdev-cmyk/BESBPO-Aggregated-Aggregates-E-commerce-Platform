import type { Metadata } from "next";
import Link from "next/link";
import { ShopByStage } from "@/components/merchandising/ShopByStage";
import { getHiddenSkus } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Shop by Build Stage — Materials for Every Stage of the Job",
  description:
    "Building materials arranged the way a job is built: site prep and earthworks, foundations, slabs, walls, paving and roads, drainage and landscaping — with the plant hire and services each stage needs.",
  alternates: { canonical: "/shop-by-stage" },
};

export default async function ShopByStagePage() {
  const hiddenSkus = await getHiddenSkus();
  return (
    <div>
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-seam-blue">Home</Link> / Shop by Build Stage
        </nav>
        <h1 className="mt-3 font-display text-3xl font-bold text-basalt md:text-4xl">Shop by build stage</h1>
        <p className="mt-3 max-w-3xl font-body text-base text-slate">
          A build goes in stages, and so does buying for it. Pick a stage to see the materials that go into it, the plant and services to
          hire, and the calculators that size it. Save a whole stage to a{" "}
          <Link href="/account/projects" className="text-seam-blue hover:underline">project list</Link>, add quantities as the drawings firm up,
          then order the priced lines or send the lot for a quote.
        </p>
      </div>
      <div className="mt-8">
        <ShopByStage hiddenSkus={hiddenSkus} heading={false} />
      </div>
    </div>
  );
}
