import { CategoryGrid } from "@/components/merchandising/CategoryGrid";
import { FeaturedProducts } from "@/components/merchandising/FeaturedProducts";
import { HeroBanner } from "@/components/merchandising/HeroBanner";
import { HowItWorks } from "@/components/merchandising/HowItWorks";
import { PromoStrip } from "@/components/merchandising/PromoStrip";
import { QuickTonnageCalculator } from "@/components/merchandising/QuickTonnageCalculator";
import { SectorsServed } from "@/components/merchandising/SectorsServed";
import { TrustBadges } from "@/components/merchandising/TrustBadges";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <QuickTonnageCalculator />
      <CategoryGrid />
      <TrustBadges />
      <FeaturedProducts />
      <HowItWorks />
      <SectorsServed />
      <PromoStrip />
    </>
  );
}
