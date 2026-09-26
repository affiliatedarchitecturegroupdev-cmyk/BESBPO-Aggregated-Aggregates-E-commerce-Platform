import { Module } from "@nestjs/common";
import { PricingController } from "./pricing.controller";
import { PricingService } from "./pricing.service";

/**
 * Thin client wrapping the FastAPI pricing microservice (services/pricing).
 * The NestJS backend does not duplicate calculator logic — it proxies to
 * the single source of truth so the ton<->m3 and delivery-band math is
 * never computed two different ways.
 */
@Module({
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
