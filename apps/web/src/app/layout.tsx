import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { Header } from "@/components/layout/Header";
import { PhotoPreviewBanner } from "@/components/layout/PhotoPreviewBanner";
import { CORPORATE_EMAILS, PHONE_LINES, REGISTERED_ADDRESS } from "@/data/corporate-contact";
import { SOCIAL_LINKS } from "@/data/social";
import { SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-ibm-plex-mono" });

// Pages pick up CMS and merchandising changes within a minute (admin saves
// revalidate immediately).
export const revalidate = 60;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aggregated Aggregates — Every Layer Starts Here",
    template: "%s — Aggregated Aggregates",
  },
  description:
    "Sub-base, crushed stone, sand, and decorative aggregates — sold by ton, m³ or bag, delivered across KZN and Gauteng. A Besbpo Group division.",
  openGraph: { siteName: "Aggregated Aggregates", locale: "en_ZA", type: "website" },
};

// Site-wide schema.org Organization. Only live social accounts are asserted as sameAs.
const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Aggregated Aggregates",
  url: SITE_URL,
  logo: `${SITE_URL}/icon`,
  parentOrganization: { "@type": "Organization", name: "Besbpo Group (Pty) Ltd" },
  email: CORPORATE_EMAILS.sales,
  telephone: (PHONE_LINES.find((line) => line.status === "live") ?? PHONE_LINES[0]).tel,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${REGISTERED_ADDRESS.line1}, ${REGISTERED_ADDRESS.line2}`,
    addressLocality: REGISTERED_ADDRESS.city,
    addressRegion: REGISTERED_ADDRESS.province,
    postalCode: REGISTERED_ADDRESS.postalCode,
    addressCountry: "ZA",
  },
  sameAs: SOCIAL_LINKS.filter((s) => s.status === "live").map((s) => s.url),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} font-body`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION).replace(/</g, "\\u003c") }} />
        <PhotoPreviewBanner />
        <AnnouncementBar />
        <Header />
        <main>{children}</main>
        <Footer />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
