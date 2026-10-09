import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { PromoSlot } from "@/components/merchandising/PromoSlot";
import { CORPORATE_EMAILS, PHONE_LINES, REGISTERED_ADDRESS } from "@/data/corporate-contact";
import { CORE_CATEGORIES } from "@/data/categories";
import { PAYMENT_METHODS } from "@/data/payment-methods";
import { PaymentLogo } from "@/components/payment/PaymentLogo";
import { NewsletterSignup } from "@/components/newsletter/NewsletterSignup";
import { CORPORATE_SITE_URL, GROUP_SITE_URL, LEGAL_ENTITY, SOCIAL_LINKS } from "@/data/social";
import { getActivePromotions } from "@/lib/promotions";

const LEGAL_LINKS = [
  { href: "/legal/privacy-policy", label: "Privacy Policy" },
  { href: "/legal/terms-and-conditions", label: "Terms & Conditions" },
  { href: "/legal/hire-terms", label: "Hire & Services Terms" },
  { href: "/legal/partner-terms", label: "Partner Terms" },
  { href: "/legal/popia-notice", label: "POPIA Notice" },
  { href: "/legal/cookie-policy", label: "Cookie Policy" },
  { href: "/legal/returns-refunds", label: "Returns & Refunds" },
  { href: "/legal/shipping-delivery", label: "Shipping & Delivery" },
  { href: "/legal/paia-manual", label: "PAIA Manual" },
  { href: "/photo-credits", label: "Photo Credits" },
];

export async function Footer() {
  const promotions = await getActivePromotions();
  const general = PHONE_LINES.find((line) => line.status === "live") ?? PHONE_LINES[0];
  return (
    <footer className="mt-16">
      {promotions.FOOTER_STRIP && (
        <div className="mx-auto max-w-6xl px-4 pb-8">
          <PromoSlot promotion={promotions.FOOTER_STRIP} />
        </div>
      )}
      <NewsletterSignup />
      <div className="border-t border-basalt/10 bg-basalt text-limestone">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <Logo inverted />
            <p className="mt-4 font-body text-sm text-limestone/70">Every Layer Starts Here.</p>
            <address className="mt-4 space-y-0.5 font-body text-xs not-italic text-limestone/70">
              <p>{REGISTERED_ADDRESS.line1}, {REGISTERED_ADDRESS.line2}</p>
              <p>{REGISTERED_ADDRESS.city}, {REGISTERED_ADDRESS.province}, {REGISTERED_ADDRESS.postalCode}</p>
              <p className="pt-1">
                <a href={`tel:${general.tel}`} className="hover:text-ochre-gold">{general.number}</a>
              </p>
              <p>
                <a href={`mailto:${CORPORATE_EMAILS.sales}`} className="hover:text-ochre-gold">{CORPORATE_EMAILS.sales}</a>
              </p>
            </address>
            <ul className="mt-3 space-y-1 font-mono text-xs text-limestone/60">
              <li>
                <a href={CORPORATE_SITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ochre-gold">
                  Aggregated Aggregates corporate site ↗
                </a>
              </li>
              <li>
                <a href={GROUP_SITE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-ochre-gold">
                  A Besbpo Group division ↗
                </a>
              </li>
            </ul>
            <ul className="mt-4 flex flex-wrap items-center gap-3" aria-label="Follow us">
              {SOCIAL_LINKS.filter((social) => social.status === "live").map((social) => (
                <li key={social.platform}>
                  <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={`Besbpo Group on ${social.platform}`} title={social.platform} className="flex h-8 w-8 items-center justify-center rounded-sm transition-opacity hover:opacity-80">
                    {/* eslint-disable-next-line @next/next/no-img-element -- official brand icon (PAYMENT_ASSETS.md, "Social icons") */}
                    <img src={`/social-icons/${social.iconAssetPath}`} alt="" className="h-6 w-6 object-contain" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <FooterColumn title="Shop">
            {CORE_CATEGORIES.slice(0, 5).map((c) => (
              <li key={c.slug}>
                <Link href={`/products?category=${c.slug}`}>{c.name}</Link>
              </li>
            ))}
            <li><Link href="/cement">Cement</Link></li>
            <li><Link href="/ready-mix">Ready-Mix Concrete</Link></li>
            <li><Link href="/reinforcing-steel">Reinforcing &amp; Structural Steel</Link></li>
            <li><Link href="/products">All products</Link></li>
          </FooterColumn>
          <FooterColumn title="Hire & Services">
            <li><Link href="/plant-hire">Plant Hire</Link></li>
            <li><Link href="/services">Site Services</Link></li>
            <li><Link href="/job-packs">Job Packs</Link></li>
            <li><Link href="/plant-hire/how-it-works">How Hire Bookings Work</Link></li>
            <li><Link href="/estimator">Project Estimator</Link></li>
            <li><Link href="/recycled">Recycled Aggregate Loop</Link></li>
            <li><Link href="/testing">Cube & Compaction Testing</Link></li>
            <li><Link href="/partners">Become a Partner</Link></li>
            <li><Link href="/partners/onboarding">Partner Onboarding</Link></li>
          </FooterColumn>
          <FooterColumn title="Buy">
            <li><Link href="/quote">Request a Quote</Link></li>
            <li><Link href="/coverage">Where We Deliver</Link></li>
            <li><Link href="/delivery-areas">Delivery Areas & Charges</Link></li>
            <li><Link href="/suppliers">Partner Network</Link></li>
            <li><Link href="/ways-to-pay">Ways to Pay</Link></li>
            <li><Link href="/trade-accounts">Trade Accounts</Link></li>
            <li><Link href="/account/dashboard">My Account</Link></li>
          </FooterColumn>
          <FooterColumn title="Company">
            <li><Link href="/about">About</Link></li>
            <li><Link href="/industries-we-serve">Industries We Serve</Link></li>
            <li><Link href="/case-studies">Case Studies</Link></li>
            <li><Link href="/responsible-sourcing">Responsible Sourcing</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/blog">Blog</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/contact">Contact & Sales</Link></li>
          </FooterColumn>
          <FooterColumn title="Legal & Compliance">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </FooterColumn>
        </div>
        <div className="border-t border-limestone/10 px-4 py-5">
          <ul className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-3" aria-label="Payment methods we accept">
            {PAYMENT_METHODS.filter((m) => !m.tradeOnly).map((method) => (
              <li key={method.key}>
                <Link href="/ways-to-pay" title={method.displayName}>
                  <PaymentLogo method={method} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-limestone/10 px-4 py-4 text-center font-mono text-xs text-limestone/50">
          <p>
            {LEGAL_ENTITY.name} T/A {LEGAL_ENTITY.tradingAs} · Reg. no. {LEGAL_ENTITY.registrationNumber}
          </p>
          <p className="mt-1">© {new Date().getFullYear()} {LEGAL_ENTITY.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-body text-sm font-semibold text-ochre-gold">{title}</p>
      <ul className="mt-3 space-y-2 font-body text-sm text-limestone/80 [&_a:hover]:text-limestone">{children}</ul>
    </div>
  );
}
