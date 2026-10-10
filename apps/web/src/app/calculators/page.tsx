import type { Metadata } from "next";
import Link from "next/link";
import { CalculatorIcon } from "@/components/merchandising/CalculatorIcon";
import { availableCalculators } from "@/data/calculators";
import { getHiddenSkus } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Building Material Calculators — Tonnage, Concrete, Bricks, Paving, Drains & Rebar",
  description:
    "Free calculators to size the job before you order: tons to m³ for sand and stone, ready-mix volume, bricks and blocks for a wall, pavers for an area, French drain stone and pipe, and rebar mass.",
  alternates: { canonical: "/calculators" },
};

export default async function CalculatorsPage() {
  const calculators = availableCalculators(await getHiddenSkus());
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">
          Home
        </Link>{" "}
        / Calculators
      </nav>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt md:text-4xl">Calculators</h1>
      <p className="mt-3 max-w-3xl font-body text-base text-slate">
        Size the job before you order. Each calculator sits with the materials it sizes, so the answer goes straight into the cart or a{" "}
        <Link href="/account/projects" className="text-seam-blue hover:underline">
          project list
        </Link>
        . They give a guide for ordering — the drawings, your engineer and your builder&apos;s take-off govern.
      </p>
      <ul className="mt-8 grid gap-4 md:grid-cols-2">
        {calculators.map((c) => (
          <li key={c.key}>
            <Link
              href={c.href}
              className="group flex h-full gap-4 rounded-sm border border-basalt/10 bg-white p-5 transition hover:border-seam-blue hover:shadow-sm"
            >
              <CalculatorIcon icon={c.icon} className="h-9 w-9 shrink-0 text-seam-blue" />
              <div className="flex min-w-0 flex-col">
                <h2 className="font-display text-lg font-semibold text-basalt group-hover:text-seam-blue">{c.name}</h2>
                <p className="mt-0.5 font-body text-sm font-medium text-basalt">{c.works}</p>
                <p className="mt-2 font-body text-sm text-slate">{c.detail}</p>
                <p className="mt-auto pt-3 font-body text-sm font-semibold text-seam-blue">{c.cta} →</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
