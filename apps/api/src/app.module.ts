import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountModule } from "./account/account.module";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { ContentModule } from "./content/content.module";
import { MerchandisingModule } from "./merchandising/merchandising.module";
import { HealthModule } from "./health/health.module";
import { ComplianceDocumentsModule } from "./compliance-documents/compliance-documents.module";
import { OrdersModule } from "./orders/orders.module";
import { PricingModule } from "./pricing/pricing.module";
import { QuotesModule } from "./quotes/quotes.module";
import { StorageModule } from "./storage/storage.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { TradeAccountsModule } from "./trade-accounts/trade-accounts.module";
import { PromotionsModule } from "./promotions/promotions.module";
import { MediaModule } from "./media/media.module";
import { BlogModule } from "./blog/blog.module";
import { PaymentGatewayModule } from "./payment-gateway/payment-gateway.module";
import { WhatsAppModule } from "./channels/whatsapp/whatsapp.module";
import { CatalogueFeedModule } from "./channels/catalogue-feed/catalogue-feed.module";
import { NotificationsModule } from "./notifications/notifications.module";

import { CareersModule } from "./careers/careers.module";
import { NewsletterModule } from "./newsletter/newsletter.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    HealthModule,
    AuthModule,
    AccountModule,
    CatalogueModule,
    ContentModule,
    MerchandisingModule,
    PricingModule,
    TradeAccountsModule,
    QuotesModule,
    OrdersModule,
    SuppliersModule,
    ComplianceDocumentsModule,
    PromotionsModule,
    MediaModule,
    BlogModule,
    PaymentGatewayModule,
    WhatsAppModule,
    CatalogueFeedModule,
    NotificationsModule,
    CareersModule,
    NewsletterModule,
  ],
})
export class AppModule {}
