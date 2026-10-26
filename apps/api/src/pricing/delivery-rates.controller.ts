import { Body, Controller, Get, Put } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PricingService } from "./pricing.service";

/** Admin → Delivery rates (docs/delivery-rates.md): public, so the storefront shows the rates it charges. */
@Controller("pricing/delivery-rates")
export class DeliveryRatesController {
  constructor(private readonly pricing: PricingService) {}

  @Public()
  @Get()
  rates() {
    return this.pricing.deliveryRates();
  }

  @Roles("ADMIN")
  @Put()
  save(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    return this.pricing.setDeliveryRates(body, user.id);
  }
}
