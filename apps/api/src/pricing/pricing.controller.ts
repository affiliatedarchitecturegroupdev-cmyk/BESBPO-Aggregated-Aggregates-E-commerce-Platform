import { Body, Controller, Post } from "@nestjs/common";
import { PricingService } from "./pricing.service";

@Controller("pricing")
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post("tonnage-volume")
  calculateTonnageVolume(
    @Body()
    body: { sku: string; quantity: number; unit: "ton" | "m3" | "bag"; customerTier?: "RETAIL" | "CONTRACTOR_TRADE" | "VOLUME_CIVIL_BULK" },
  ) {
    return this.pricingService.calculateTonnageVolume({
      sku: body.sku,
      quantity: body.quantity,
      unit: body.unit,
      customerTier: body.customerTier ?? "RETAIL",
    });
  }

  @Post("delivery-fee")
  calculateDeliveryFee(@Body() body: { distanceKm: number; quantityM3: number }) {
    return this.pricingService.calculateDeliveryFee(body);
  }
}
