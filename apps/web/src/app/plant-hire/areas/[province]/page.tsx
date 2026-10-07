import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HireHowItWorks } from "@/components/plant/HowItWorks";
import { PlantCard, ServiceCard } from "@/components/plant/PlantCard";
import { plantBySku, ratedRegions, serviceBySku } from "@/data/plant-services";
import { findCoveredProvince } from "@/lib/hire-coverage";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { province: string } }): Promise<Metadata> {
  const covered = await findCoveredProvince(params.province);
  if (!covered) return { robots: { index: false } };
  return {
    title: `Plant Hire in ${covered.province} — TLBs, Excavators, Tippers & Rollers`,
    description: `Wet hire of earthmoving plant and site services in ${covered.province} from vetted local partners — machine, operator and fuel. Request a written quote.`,
    alternates: { canonical: `/plant-hire/areas/${params.province}` },
  };
}

/**
 * A province page exists only while that province has at least one active
 * partner with active fleet — otherwise it's a 404 and left out of the
 * sitemap, so we never promise hire where we can't deliver it.
 */
export default async function ProvinceHirePage({ params }: { params: { province: string } }) {
  const covered = await findCoveredProvince(params.province);
  if (!covered) notFound();
  const plant = covered.skus.map(plantBySku).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const services = covered.skus.map(serviceBySku).filter((s): s is NonNullable<typeof s> => Boolean(s));
  const priced = covered.skus.filter((sku) => ratedRegions(sku).includes(covered.province));
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / <Link href="/plant-hire" className="hover:text-seam-blue">Plant Hire</Link> /{" "}
        <Link href="/plant-hire/areas" className="hover:text-seam-blue">By province</Link> / {covered.province}
      </nav>
      <p className="mt-6 font-mono text-xs uppercase tracking-widest text-seam-blue">Wet hire · operator · fuel · PPE</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-basalt md:text-4xl">Plant hire in {covered.province}</h1>
      <p className="mt-3 max-w-2xl font-body text-sm text-slate">
        Vetted partners in {covered.province} are taking jobs through the platform for the machines and services below.{" "}
        {priced.length === 0 ? "Each job gets a written quote from a partner near your site." : "Some have published rates; the rest are quoted per job."}
      </p>

      {plant.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-basalt">Machines available in {covered.province}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plant.map((p) => <PlantCard key={p.sku} item={p} />)}
          </div>
        </section>
      )}
      {services.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-basalt">Site services in {covered.province}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => <ServiceCard key={s.sku} item={s} />)}
          </div>
        </section>
      )}

      <p className="mt-8 font-body text-sm text-slate">
        Need something not listed here? <Link href="/plant-hire" className="font-semibold text-seam-blue hover:underline">Browse every machine</Link> and send a
        request — we&apos;ll look for a partner near your site.
      </p>

      <h2 className="mt-14 font-display text-2xl font-bold text-basalt">How it works</h2>
      <div className="mt-5">
        <HireHowItWorks />
      </div>
    </div>
  );
}
