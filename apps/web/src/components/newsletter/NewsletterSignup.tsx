"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { subscribeToNewsletter } from "@/app/newsletter/actions";

const field = "w-full rounded-sm border border-limestone/20 bg-basalt/40 px-3 py-2.5 font-body text-sm text-limestone placeholder:text-limestone/50 focus:border-ochre-gold focus:outline-none";

const PROVINCES = ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="rounded-sm bg-ochre-gold px-5 py-2.5 font-body text-sm font-semibold text-basalt hover:bg-limestone disabled:opacity-60">
      {pending ? "Subscribing…" : "Subscribe"}
    </button>
  );
}

/** The newsletter strip directly above the footer, on every page. */
export function NewsletterSignup() {
  const [state, action] = useFormState(subscribeToNewsletter, null);
  const pathname = usePathname();
  return (
    <section aria-labelledby="newsletter-heading" className="bg-seam-blue text-limestone">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_1.6fr] lg:items-center">
        <div>
          <h2 id="newsletter-heading" className="font-display text-xl font-bold">The Aggregated Aggregates newsletter</h2>
          <p className="mt-2 font-body text-sm text-limestone/80">
            For customers, contractors and partners: price updates, new products and suppliers, delivery coverage, and site-ready advice. About twice a month.
          </p>
        </div>
        {state?.success ? (
          <p role="status" className="rounded-sm border border-limestone/30 bg-basalt/30 p-4 font-body text-sm">{state.success}</p>
        ) : (
          <form action={action} className="space-y-3">
            <input type="hidden" name="source" value={pathname} />
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Website <input type="text" name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
              <label className="sr-only" htmlFor="newsletter-email">Email address</label>
              <input id="newsletter-email" name="email" type="email" required autoComplete="email" placeholder="Your email address" className={field} />
              <label className="sr-only" htmlFor="newsletter-audience">I am a</label>
              <select id="newsletter-audience" name="audience" defaultValue="CUSTOMER" className={field}>
                <option value="CUSTOMER">Customer</option>
                <option value="CONTRACTOR">Contractor / builder</option>
                <option value="PARTNER">Supplier / partner</option>
                <option value="OTHER">Other</option>
              </select>
              <label className="sr-only" htmlFor="newsletter-province">Province</label>
              <select id="newsletter-province" name="province" defaultValue="" className={field}>
                <option value="">Province (optional)</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <Submit />
            </div>
            <label className="flex items-start gap-2 font-body text-xs text-limestone/80">
              <input type="checkbox" name="consent" required className="mt-0.5 h-4 w-4 shrink-0 accent-ochre-gold" />
              <span>
                I agree to receive the newsletter by email. I can unsubscribe at any time from any email.{" "}
                <Link href="/legal/privacy-policy" className="underline hover:text-ochre-gold">Privacy Policy</Link>
              </span>
            </label>
            {state?.error && <p role="alert" className="font-body text-sm text-ochre-gold">{state.error}</p>}
          </form>
        )}
      </div>
    </section>
  );
}
