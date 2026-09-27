import { CategoryGrid } from "@/components/merchandising/CategoryGrid";
import { FeaturedProducts } from "@/components/merchandising/FeaturedProducts";
import { HeroBanner } from "@/components/merchandising/HeroBanner";
import { HowItWorks } from "@/components/merchandising/HowItWorks";
import { PromoStrip } from "@/components/merchandising/PromoStrip";
import { QuickTonnageCalculator } from "@/components/merchandising/QuickTonnageCalculator";
import { SectorsServed } from "@/components/merchandising/SectorsServed";
import { TrustBadges } from "@/components/merchandising/TrustBadges";
import { getHiddenSkus, getSiteContent } from "@/lib/cms";

export default async function HomePage() {
  const [content, hiddenSkus] = await Promise.all([getSiteContent(), getHiddenSkus()]);
  return (
    <>
      <HeroBanner content={content.hero} />
      <QuickTonnageCalculator hiddenSkus={hiddenSkus} />
      <CategoryGrid />
      <TrustBadges />
      <FeaturedProducts />
      <HowItWorks />
      <SectorsServed />
      <PromoStrip content={content.promo} />
    </>
  );
}
