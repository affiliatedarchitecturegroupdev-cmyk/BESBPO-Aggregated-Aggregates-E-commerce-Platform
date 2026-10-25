import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersModule } from "../orders/orders.module";
import { PaymentGatewayModule } from "../payment-gateway/payment-gateway.module";
import { PricingModule } from "../pricing/pricing.module";
import { SupplierPricesModule } from "../supplier-prices/supplier-prices.module";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { SalesQuotesController } from "./sales-quotes.controller";
import { SalesQuotesService } from "./sales-quotes.service";

@Module({
  imports: [NotificationsModule, PricingModule, OrdersModule, PaymentGatewayModule, SupplierPricesModule],
  controllers: [QuotesController, SalesQuotesController],
  providers: [QuotesService, SalesQuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
