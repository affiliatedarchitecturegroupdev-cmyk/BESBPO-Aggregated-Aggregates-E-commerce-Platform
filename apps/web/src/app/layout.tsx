import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ibmPlexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-ibm-plex-mono" });

export const metadata: Metadata = {
  title: "Aggregated Aggregates — Every Layer Starts Here",
  description:
    "Sub-base, crushed stone, sand, and decorative aggregates — sold by ton or bag, delivered across KZN and Gauteng. A Besbpo Group division.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA">
      <body className={`${spaceGrotesk.variable} ${inter.variable} ${ibmPlexMono.variable} font-body`}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
