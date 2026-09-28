import type { Metadata } from "next";
import Link from "next/link";
import { whatsAppLink } from "@/components/social/WhatsAppCta";
import { CORPORATE_EMAILS, PHONE_LINES, REGISTERED_ADDRESS } from "@/data/corporate-contact";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to Aggregated Aggregates about bulk orders, trade accounts or supply partnerships — phone, email, WhatsApp and our registered office.",
  alternates: { canonical: "/contact" },
};

const labelClass = "mb-1 block font-body text-xs font-semibold text-basalt";
const inputClass = "w-full rounded-sm border border-basalt/20 bg-white px-3 py-2 font-body text-sm";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <nav className="font-mono text-xs text-slate" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-seam-blue">Home</Link> / Contact
      </nav>
      <h1 className="mt-4 font-display text-2xl font-bold text-basalt">Contact Us</h1>
      <p className="mt-2 max-w-2xl font-body text-sm text-slate">
        For bulk orders, trade accounts, or supply partnerships. Need delivered pricing?{" "}
        <Link href="/quote" className="text-seam-blue hover:underline">Request a quote</Link> — we respond within 1 business day.
      </p>

      <div className="mt-8 grid gap-10 md:grid-cols-2">
        {/* Hands off to the visitor's email client until enquiries go through the API. */}
        <form className="space-y-4" action={`mailto:${CORPORATE_EMAILS.sales}`} method="post" encType="text/plain">
          <div>
            <label htmlFor="contact-name" className={labelClass}>Full name</label>
            <input id="contact-name" name="name" required autoComplete="name" className={inputClass} />
          </div>
          <div>
            <label htmlFor="contact-email" className={labelClass}>Email address</label>
            <input id="contact-email" name="email" type="email" required autoComplete="email" className={inputClass} />
          </div>
          <div>
            <label htmlFor="contact-company" className={labelClass}>Company (optional)</label>
            <input id="contact-company" name="company" autoComplete="organization" className={inputClass} />
          </div>
          <div>
            <label htmlFor="contact-message" className={labelClass}>Message</label>
            <textarea id="contact-message" name="message" required rows={5} className={inputClass} />
          </div>
          <button type="submit" className="rounded-sm bg-basalt px-6 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-seam-blue">
            Send Message
          </button>
        </form>

        <div className="space-y-6">
          <section>
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Phone</h2>
            <ul className="mt-2 space-y-1 font-body text-sm text-basalt">
              {PHONE_LINES.map((line) => (
                <li key={line.tel} className="flex flex-wrap items-center gap-2">
                  <span className="w-36 text-slate">{line.label}</span>
                  {line.status === "live" ? (
                    <a href={`tel:${line.tel}`} className="hover:text-seam-blue">{line.number}</a>
                  ) : (
                    <>
                      <span>{line.number}</span>
                      <span className="rounded-sm bg-white px-1.5 py-0.5 font-mono text-[9px] uppercase text-slate">Activation pending</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Email</h2>
            <ul className="mt-2 space-y-1 font-body text-sm">
              <li><span className="inline-block w-36 text-slate">Sales</span><a href={`mailto:${CORPORATE_EMAILS.sales}`} className="text-seam-blue hover:underline">{CORPORATE_EMAILS.sales}</a></li>
              <li><span className="inline-block w-36 text-slate">Supply partners</span><a href={`mailto:${CORPORATE_EMAILS.partners}`} className="text-seam-blue hover:underline">{CORPORATE_EMAILS.partners}</a></li>
            </ul>
          </section>
          <section>
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">WhatsApp</h2>
            <a href={whatsAppLink("Hi Aggregated Aggregates, I have a question.")} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-sm border border-[#25D366] px-4 py-2 font-body text-xs font-semibold text-[#128C7E] hover:bg-[#25D366]/10">
              Chat with sales on WhatsApp
            </a>
          </section>
          <section>
            <h2 className="font-mono text-[10px] uppercase tracking-widest text-seam-blue">Registered office</h2>
            <address className="mt-2 font-body text-sm not-italic text-basalt">
              {REGISTERED_ADDRESS.line1}
              <br />
              {REGISTERED_ADDRESS.line2}
              <br />
              {REGISTERED_ADDRESS.city}, {REGISTERED_ADDRESS.province}, {REGISTERED_ADDRESS.postalCode}
              <br />
              {REGISTERED_ADDRESS.country}
            </address>
            <p className="mt-1 font-mono text-[10px] text-slate">A Besbpo Group (Pty) Ltd division — we hold no stock at this address.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
