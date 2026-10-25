import { BusinessLinesCarousel } from "@/components/merchandising/BusinessLinesCarousel";
import { JobPacksSection, PartnerCta, PlantAndServicesSection } from "@/components/merchandising/BusinessSections";
import { BulkVsBagged } from "@/components/merchandising/BulkVsBagged";
import { B2BBulkSection } from "@/components/merchandising/B2BBulkSection";
import { CalculatorsStrip } from "@/components/merchandising/CalculatorsStrip";
import { CategoryGrid } from "@/components/merchandising/CategoryGrid";
import { ComplianceBar } from "@/components/merchandising/ComplianceBar";
import { BadgeCarouselCompact } from "@/components/sourcing/BadgeCarouselCompact";
import { CorporateSiteBand } from "@/components/merchandising/CorporateSiteBand";
import { CoverageStrip } from "@/components/merchandising/CoverageStrip";
import { DeliveryBand } from "@/components/merchandising/DeliveryBand";
import { DepartmentTiles } from "@/components/merchandising/DepartmentTiles";
import { ExpressBand } from "@/components/merchandising/ExpressBand";
import { FinishTheBuild } from "@/components/merchandising/FinishTheBuild";
import { FeaturedProducts } from "@/components/merchandising/FeaturedProducts";
import { RecentlyViewed } from "@/components/merchandising/RecentlyViewed";
import { GroupCrossSell } from "@/components/merchandising/GroupCrossSell";
import { HeroBanner } from "@/components/merchandising/HeroBanner";
import { HeroSlideshow } from "@/components/merchandising/HeroSlideshow";
import { HomeExpressRows, HomeMerchandising } from "@/components/merchandising/HomeMerchandising";
import { CompareTray } from "@/components/product/CompareTray";
import { IndustriesWeServe } from "@/components/merchandising/IndustriesWeServe";
import { PlanYourBuild } from "@/components/merchandising/PlanYourBuild";
import { ProjectTools } from "@/components/merchandising/ProjectTools";
import { PromoSlot } from "@/components/merchandising/PromoSlot";
import { PromoStrip } from "@/components/merchandising/PromoStrip";
import { QuarryToSite } from "@/components/merchandising/QuarryToSite";
import { ShopByStage } from "@/components/merchandising/ShopByStage";
import { QuickTonnageCalculator } from "@/components/merchandising/QuickTonnageCalculator";
import { SteelSpotlight } from "@/components/merchandising/SteelSpotlight";
import { TierComparison } from "@/components/merchandising/TierComparison";
import { TrustBadges } from "@/components/merchandising/TrustBadges";
import { WhatsAppCta } from "@/components/social/WhatsAppCta";
import { getDeliveryRates, getHiddenSkus, getSiteContent, slideshowSlides } from "@/lib/cms";
import { getCoverage, getNetwork } from "@/lib/network";
import { getActivePromotions } from "@/lib/promotions";

/**
 * Section order (Oct 2026): hero, the delivery checker and departments first —
 * find it, check delivery, shop — then the product-led merchandising rows
 * (docs/merchandising.md), AA 60/120 express with what qualifies, featured products and tools, building
 * supplies, the project tools (BOQ, credit, phased deliveries), the wider business (plant, services,
 * B2B bulk), and the why-us sections together.
 */
export default async function HomePage() {
  const [content, hiddenSkus, promotions, coverage, network, delivery] = await Promise.all([
    getSiteContent(),
    getHiddenSkus(),
    getActivePromotions(),
    getCoverage(),
    getNetwork(),
    getDeliveryRates(),
  ]);
  const liveProvinces = coverage && coverage.deliveryPoints > 0 ? coverage.provinces.map((p) => p.province) : [];
  const partnerSuppliers = network && network.partners.length > 0 ? network.partners.length : null;
  return (
    <>
      <HeroBanner content={content.hero} />
      {/* The public location service: where's my nearest supplier, and what does delivery cost? */}
      <DeliveryBand />
      <DepartmentTiles />
      {/* Product-led sections from real data (collections, best sellers, buy online today, season, new, trending, brands). */}
      <HomeMerchandising hiddenSkus={hiddenSkus} />
      {/* AA 60/120 express delivery, with what qualifies and the under-R500 essentials. */}
      <ExpressBand />
      <HomeExpressRows hiddenSkus={hiddenSkus} />
      <HeroSlideshow slides={slideshowSlides(content.slideshow)} intervalSeconds={content.slideshow.intervalSeconds} />
      <TrustBadges partnerSuppliers={partnerSuppliers} liveProvinces={liveProvinces} />
      {/* Returning visitors pick up where they left off; nothing shows on a first visit. */}
      <div className="mx-auto max-w-6xl px-4">
        <RecentlyViewed hiddenSkus={hiddenSkus} className="my-10" />
      </div>
      <FeaturedProducts />
      <QuickTonnageCalculator hiddenSkus={hiddenSkus} rules={delivery.rules} />
      <CategoryGrid />
      <ShopByStage hiddenSkus={hiddenSkus} />
      <SteelSpotlight hiddenSkus={hiddenSkus} />
      {/* The building-supplies departments: what finishes the job. */}
      <FinishTheBuild hiddenSkus={hiddenSkus} />
      <CalculatorsStrip hiddenSkus={hiddenSkus} />
      <PlanYourBuild />
      {/* BOQ upload, trade credit, phased deliveries, proof of delivery, ways to pay, lead times. */}
      <ProjectTools />
      <BulkVsBagged rules={delivery.rules} />
      <BusinessLinesCarousel />
      <PlantAndServicesSection />
      <JobPacksSection />
      {promotions.HOMEPAGE_SECONDARY_BANNER && (
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <PromoSlot promotion={promotions.HOMEPAGE_SECONDARY_BANNER} />
        </section>
      )}
      <B2BBulkSection />
      <IndustriesWeServe />
      <GroupCrossSell promotion={promotions.GROUP_CROSS_SELL} />
      {/* Why buy from us: sourcing, standards and the partner network, together. */}
      <QuarryToSite partnerSuppliers={partnerSuppliers} />
      <ComplianceBar />
      <BadgeCarouselCompact />
      <TierComparison />
      <PartnerCta />
      <CoverageStrip coverage={coverage} />
      <CorporateSiteBand partnerSuppliers={partnerSuppliers} />
      <WhatsAppCta />
      <PromoStrip content={content.promo} />
      <CompareTray />
    </>
  );
}
