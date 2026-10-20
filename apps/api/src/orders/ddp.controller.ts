import { Body, Controller, Get, Put } from "@nestjs/common";
import type { AuthUser } from "../common/auth/auth-user";
import { Public, Roles } from "../common/auth/decorators";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { DdpService } from "./ddp.service";
import { DdpPolicyDto } from "./dto/create-order.dto";

/** Distributed Delivery Premium (docs/delivery-premium.md): the rates, public so the storefront can explain them. */
@Controller("orders/delivery-premium")
export class DdpController {
  constructor(private readonly ddp: DdpService) {}

  @Public()
  @Get("policy")
  policy() {
    return this.ddp.policy();
  }

  @Roles("ADMIN")
  @Put("policy")
  setPolicy(@Body() dto: DdpPolicyDto, @CurrentUser() user: AuthUser) {
    return this.ddp.setPolicy(dto, user);
  }

  @Roles("STAFF", "ADMIN")
  @Get("stats")
  stats() {
    return this.ddp.stats();
  }
}
