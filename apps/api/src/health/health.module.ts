import { Module } from "@nestjs/common";
import { PricingModule } from "../pricing/pricing.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [PricingModule],
  controllers: [HealthController],
})
export class HealthModule {}
