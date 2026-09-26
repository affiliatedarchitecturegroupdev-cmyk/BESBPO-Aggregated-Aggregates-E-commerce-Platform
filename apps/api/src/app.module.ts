import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./common/prisma.module";
import { CatalogueModule } from "./catalogue/catalogue.module";
import { HealthModule } from "./health/health.module";
import { ComplianceDocumentsModule } from "./compliance-documents/compliance-documents.module";
import { OrdersModule } from "./orders/orders.module";
import { PricingModule } from "./pricing/pricing.module";
import { QuotesModule } from "./quotes/quotes.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { TradeAccountsModule } from "./trade-accounts/trade-accounts.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CatalogueModule,
    PricingModule,
    TradeAccountsModule,
    QuotesModule,
    OrdersModule,
    SuppliersModule,
    ComplianceDocumentsModule,
  ],
})
export class AppModule {}
