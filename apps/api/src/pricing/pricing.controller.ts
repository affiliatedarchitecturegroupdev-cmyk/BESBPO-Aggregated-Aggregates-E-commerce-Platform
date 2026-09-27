import { Body, Controller, Post } from "@nestjs/common";
import { Public } from "../common/auth/decorators";
import { CustomerTierName, PricingService, PricingUnit } from "./pricing.service";

@Public()
@Controller("pricing")
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post("tonnage-volume")
  calculateTonnageVolume(
    @Body() body: { sku: string; quantity: number; unit: PricingUnit; customerTier?: CustomerTierName },
  ) {
    return this.pricingService.calculateTonnageVolume({
      sku: body.sku,
      quantity: body.quantity,
      unit: body.unit,
      customerTier: body.customerTier ?? "RETAIL",
    });
  }

  @Post("delivery-fee")
  calculateDeliveryFee(
    @Body()
    body: { distanceKm: number; bulkM3?: number; bulkTons?: number; baggedKg?: number; customerTier?: CustomerTierName },
  ) {
    return this.pricingService.calculateDeliveryFee({ ...body, customerTier: body.customerTier ?? "RETAIL" });
  }
}
