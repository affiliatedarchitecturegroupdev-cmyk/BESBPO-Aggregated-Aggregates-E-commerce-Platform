import type { Metadata } from "next";
import Link from "next/link";
import { ProjectEstimator } from "@/components/estimator/ProjectEstimator";

export const metadata: Metadata = {
  title: "Project Estimator — Volume, Tonnes & Truck Loads",
  description: "Size a driveway, slab, drainage trench, building platform or demolition-to-fill job: volume, approximate tonnes and tipper loads, then request one written quote.",
  alternates: { canonical: "/estimator" },
};

export default function EstimatorPage({ searchParams }: { searchParams: { job?: string } }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/job-packs" className="hover:text-seam-blue">Job Packs</Link> / Estimator
      </nav>
      <h1 className="mt-4 font-display text-3xl font-bold text-basalt">Project Estimator</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-slate">
        Pick the job and enter its size. We&apos;ll work out the volume, an approximate weight and how many truck loads it takes, and suggest the job pack
        that covers it. For a single material, the calculator on each product page uses that material&apos;s own density.
      </p>
      <div className="mt-8">
        <ProjectEstimator key={searchParams.job ?? "default"} initial={searchParams.job} />
      </div>
    </div>
  );
}
