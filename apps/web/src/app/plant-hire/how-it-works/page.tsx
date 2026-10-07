import { BadgeCheck, CreditCard, FileText, KeyRound, MessageSquare, Search, ShieldCheck, ThumbsUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { HIRE_FAQS } from "@/data/hire-faqs";

export const metadata: Metadata = {
  title: "How Hire Bookings Work — Plant Hire & Site Services",
  description:
    "From request to sign-off: written quotes from vetted partners, EFT payment, partner matching, the arrival code, job cards, and payment held until you sign off with a 48-hour dispute window.",
  alternates: { canonical: "/plant-hire/how-it-works" },
};

const STEPS = [
  { Icon: Search, title: "Tell us the job", text: "Choose a machine or service and tell us the province, site, dates and what needs doing. It's free and takes a couple of minutes." },
  { Icon: FileText, title: "Get a written quote", text: "We price your job from a vetted partner's written quote — machine, operator, fuel and transport to site where included. It appears in your account and by email." },
  { Icon: ThumbsUp, title: "Accept it", text: "Accept the quote in your account. Nothing is booked or charged before this, and you can decline at no cost." },
  { Icon: CreditCard, title: "Pay by EFT", text: "Pay the total using your booking reference. Once your payment clears, we offer the job to suitable partners near your site." },
  { Icon: BadgeCheck, title: "A partner accepts", text: "We email you the name of the partner who'll do the work. If nobody can take your dates, we offer new dates or a full refund." },
  { Icon: KeyRound, title: "Start with your arrival code", text: "When the crew arrives, open your booking and show them your 6-digit code. Entering it starts the job — so the right crew is on the right site." },
  { Icon: MessageSquare, title: "Follow the job", text: "The partner records hours, hour-meter readings or loads on daily job cards you can see. Message the crew and our team in your booking." },
  { Icon: ShieldCheck, title: "Sign off — then the partner is paid", text: "Sign the work off when it's done. You have 48 hours to raise a problem; the partner is only paid after that, or once a dispute is resolved." },
];

/** The customer's walk-through of a hire booking (PLANT_HIRE_CATALOGUE.md); every step is live. */
export default function HowHireWorksPage() {
  return (
    <div>
      <section className="bg-basalt text-limestone">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <nav className="font-mono text-xs text-limestone/60" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ochre-gold">Home</Link> / <Link href="/plant-hire" className="hover:text-ochre-gold">Plant Hire</Link> / How it works
          </nav>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-ochre-gold">Plant hire & site services</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight md:text-5xl">How a hire booking works</h1>
          <p className="mt-4 max-w-2xl font-body text-base text-limestone/80">
            Your money is held until the job is done: the partner is paid only after you sign the work off, with 48 hours to raise a problem.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12">
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="rounded-sm border border-basalt/10 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-sm bg-limestone text-seam-blue">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono text-xs text-ochre-gold">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h2 className="mt-3 font-display text-base font-semibold text-basalt">{title}</h2>
              <p className="mt-1 font-body text-sm text-slate">{text}</p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/plant-hire" className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt">Hire a machine</Link>
          <Link href="/services" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">Request a service</Link>
          <Link href="/plant-hire/safety" className="rounded-sm border border-basalt/20 px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:border-seam-blue">How we vet partners</Link>
        </div>

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-basalt">Questions</h2>
          <div className="mt-4 divide-y divide-basalt/10 rounded-sm border border-basalt/10 bg-white">
            {HIRE_FAQS.map((faq) => (
              <details key={faq.question} className="group p-5">
                <summary className="cursor-pointer list-none font-body text-sm font-semibold text-basalt group-open:text-seam-blue">{faq.question}</summary>
                <p className="mt-3 font-body text-sm text-slate">{faq.answer}</p>
              </details>
            ))}
          </div>
          <p className="mt-4 font-body text-sm text-slate">
            The full terms are in our <Link href="/legal/hire-terms" className="text-seam-blue hover:underline">Plant Hire &amp; Site Services Terms</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
