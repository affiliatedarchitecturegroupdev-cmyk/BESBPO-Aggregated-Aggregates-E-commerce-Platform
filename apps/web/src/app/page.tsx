import { CategoryGrid } from "@/components/merchandising/CategoryGrid";
import { FeaturedProducts } from "@/components/merchandising/FeaturedProducts";
import { HeroBanner } from "@/components/merchandising/HeroBanner";
import { PromoStrip } from "@/components/merchandising/PromoStrip";
import { TrustBadges } from "@/components/merchandising/TrustBadges";

export default function HomePage() {
  return (
    <>
      <HeroBanner />
      <TrustBadges />
      <CategoryGrid />
      <FeaturedProducts />
      <PromoStrip />
    </>
  );
}
