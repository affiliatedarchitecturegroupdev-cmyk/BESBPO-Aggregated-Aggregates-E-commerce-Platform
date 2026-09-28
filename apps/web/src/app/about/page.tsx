import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-basalt">About Aggregated Aggregates</h1>
      <p className="mt-4 font-body text-sm text-slate">
        Aggregated Aggregates is a division of Besbpo Group focused on sub-bases and all forms of aggregates, serving
        civil, commercial, industrial, and residential sectors across South Africa. From graded sub-base gravels
        through crushed stone, sand, crusher run, ballast, drainage stone, decorative aggregate, agricultural lime,
        and recycled aggregates — plus bulk cement, binders, grout and admixtures for infrastructure buyers. Every layer
        starts here.
      </p>
      <p className="mt-4 font-body text-sm text-slate">
        We source through an approved{" "}
        <Link href="/suppliers" className="text-seam-blue hover:underline">partner-supplier network</Link> of quarries and
        plants across South Africa — no owned yards or stock — priced
        simultaneously by weight (R/ton) and volume (R/m³), sold both loose in bulk and bagged, and delivered on a
        distance-banded tipper-truck logistics model via Besfleet and 15+ external delivery partners.
      </p>
      <p className="mt-4 font-body text-sm text-slate">
        Aggregated Aggregates is part of the wider Besbpo Group ecosystem, alongside sister divisions including
        Roofsteel, Bricksplaza, and Aluminium Store.
      </p>
    </div>
  );
}
