import type { Metadata } from "next";
import Link from "next/link";
import { SALES_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-basalt">Contact Us</h1>
      <p className="mt-2 font-body text-sm text-slate">
        For bulk orders, trade accounts, or supply partnerships, reach out below. Need delivered pricing?{" "}
        <Link href="/quote" className="text-seam-blue hover:underline">Request a quote</Link>.
      </p>
      {/* Until the CMS/API handles enquiries (Phase 4), the form hands off to the visitor's email client. */}
      <form className="mt-8 space-y-4" action={`mailto:${SALES_EMAIL}`} method="post" encType="text/plain">
        <input name="name" required placeholder="Full name" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
        <input name="email" type="email" required placeholder="Email address" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
        <input name="company" placeholder="Company (optional)" className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
        <textarea name="message" required placeholder="Message" rows={5} className="w-full rounded-sm border border-basalt/20 px-3 py-2 font-body text-sm" />
        <button type="submit" className="rounded-sm bg-basalt px-6 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-seam-blue">
          Send Message
        </button>
      </form>
      <div className="mt-8 font-body text-sm text-slate">
        <p>
          <a href={`mailto:${SALES_EMAIL}`} className="text-seam-blue hover:underline">{SALES_EMAIL}</a>
        </p>
        <p>partners@besbpo.co.za</p>
      </div>
    </div>
  );
}
