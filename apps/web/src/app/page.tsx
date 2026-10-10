import { BusinessLinesCarousel } from "@/components/merchandising/BusinessLinesCarousel";
import { JobPacksSection, PartnerCta, PlantAndServicesSection } from "@/components/merchandising/BusinessSections";
import { BulkVsBagged } from "@/components/merchandising/BulkVsBagged";
import { B2BBulkSection } from "@/components/merchandising/B2BBulkSection";
import { CategoryGrid } from "@/components/merchandising/CategoryGrid";
import { ComplianceBar } from "@/components/merchandising/ComplianceBar";
import { BadgeCarouselCompact } from "@/components/sourcing/BadgeCarouselCompact";
import { CorporateSiteBand } from "@/components/merchandising/CorporateSiteBand";
import { CoverageStrip } from "@/components/merchandising/CoverageStrip";
import { FeaturedProducts } from "@/components/merchandising/FeaturedProducts";
import { GroupCrossSell } from "@/components/merchandising/GroupCrossSell";
import { HeroBanner } from "@/components/merchandising/HeroBanner";
import { HeroSlideshow } from "@/components/merchandising/HeroSlideshow";
import { IndustriesWeServe } from "@/components/merchandising/IndustriesWeServe";
import { PromoSlot } from "@/components/merchandising/PromoSlot";
import { PromoStrip } from "@/components/merchandising/PromoStrip";
import { QuarryToSite } from "@/components/merchandising/QuarryToSite";
import { ShopByStage } from "@/components/merchandising/ShopByStage";
import { QuickTonnageCalculator } from "@/components/merchandising/QuickTonnageCalculator";
import { TierComparison } from "@/components/merchandising/TierComparison";
import { TrustBadges } from "@/components/merchandising/TrustBadges";
import { WhatsAppCta } from "@/components/social/WhatsAppCta";
import { getHiddenSkus, getSiteContent, slideshowSlides } from "@/lib/cms";
import { getCoverage, getNetwork } from "@/lib/network";
import { getActivePromotions } from "@/lib/promotions";

/** Section order follows the as-built homepage wireframe (build documentation, p. 13). */
export default async function HomePage() {
  const [content, hiddenSkus, promotions, coverage, network] = await Promise.all([
    getSiteContent(),
    getHiddenSkus(),
    getActivePromotions(),
    getCoverage(),
    getNetwork(),
  ]);
  const liveProvinces = coverage && coverage.deliveryPoints > 0 ? coverage.provinces.map((p) => p.province) : [];
  const partnerSuppliers = network && network.partners.length > 0 ? network.partners.length : null;
  return (
    <>
      <HeroBanner content={content.hero} />
      <HeroSlideshow slides={slideshowSlides(content.slideshow)} intervalSeconds={content.slideshow.intervalSeconds} />
      <TrustBadges partnerSuppliers={partnerSuppliers} liveProvinces={liveProvinces} />
      <ComplianceBar />
      <BadgeCarouselCompact />
      <QuickTonnageCalculator hiddenSkus={hiddenSkus} />
      <CategoryGrid />
      <ShopByStage hiddenSkus={hiddenSkus} />
      <BulkVsBagged />
      <FeaturedProducts />
      <BusinessLinesCarousel />
      <PlantAndServicesSection />
      <JobPacksSection />
      {promotions.HOMEPAGE_SECONDARY_BANNER && (
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <PromoSlot promotion={promotions.HOMEPAGE_SECONDARY_BANNER} />
        </section>
      )}
      <GroupCrossSell promotion={promotions.GROUP_CROSS_SELL} />
      <CorporateSiteBand partnerSuppliers={partnerSuppliers} />
      <IndustriesWeServe />
      <B2BBulkSection />
      <QuarryToSite partnerSuppliers={partnerSuppliers} />
      <TierComparison />
      <PartnerCta />
      <CoverageStrip coverage={coverage} />
      <WhatsAppCta />
      <PromoStrip content={content.promo} />
    </>
  );
}
