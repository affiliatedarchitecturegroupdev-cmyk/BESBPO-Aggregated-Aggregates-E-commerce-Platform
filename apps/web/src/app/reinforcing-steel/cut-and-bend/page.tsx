import type { Metadata } from "next";
import Link from "next/link";
import { ScheduleForm } from "@/components/steel/ScheduleForm";
import { PROVINCES } from "@/lib/careers";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Cut & Bend Rebar to Your Bar Bending Schedule",
  description:
    "Send your bar bending schedule — typed, imported from CSV, or as a PDF or Excel file — and we price the steel, cutting and bending with a merchant. Bars arrive cut, bent and tagged by bar mark.",
  alternates: { canonical: "/reinforcing-steel/cut-and-bend" },
};

/** Cut & bend requests (STEEL_CATALOGUE.md, Phase S2): a schedule in, a written quote out. */
export default async function CutAndBendPage() {
  const user = await getSession();
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> /{" "}
            <Link href="/reinforcing-steel" className="hover:text-ochre-gold">Reinforcing &amp; Structural Steel</Link> / Cut &amp; bend
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Bar bending schedule → written quote</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight">Rebar cut and bent to your schedule</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            Send your engineer&apos;s bar bending schedule. We total the steel by size, price the cutting, bending and delivery with a merchant
            in our network, and send you a written quote. Nothing is cut or charged until you accept it.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10">
        <ol className="grid gap-4 font-body text-sm sm:grid-cols-3">
          {[
            ["Send the schedule", "Type the rows, import our CSV template, or attach the schedule as a PDF, Excel file or photo."],
            ["Get a written quote", "We confirm the steel, cutting, bending, tagging and delivery with a merchant and email you one price."],
            ["Accept, and it's made", "Accept online (or reply to the email). Bars are cut, bent and tagged by bar mark, with mill certificates."],
          ].map(([title, text], i) => (
            <li key={title} className="rounded-sm border border-basalt/10 bg-white p-4">
              <p className="font-mono text-[11px] text-seam-blue">Step {i + 1}</p>
              <p className="mt-1 font-display text-base font-semibold text-basalt">{title}</p>
              <p className="mt-1 text-slate">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <ScheduleForm name={user?.name ?? undefined} email={user?.email} signedIn={Boolean(user)} provinces={PROVINCES} />
        </div>

        <p className="mt-8 max-w-3xl font-body text-xs text-slate">
          The mass shown is a check using SANS 920 nominal mass per metre — the merchant&apos;s weighbridge ticket and the written quote govern.
          Please check bar marks, sizes, shape codes and lengths against the drawings before you accept: bent bars are made to your schedule.
          Your details are used only to quote and supply this order (<Link href="/legal/privacy-policy" className="text-seam-blue hover:underline">Privacy Policy</Link>).
        </p>
      </div>
    </div>
  );
}
