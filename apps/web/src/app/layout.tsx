import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} font-body`}>
        <AnnouncementBar />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
