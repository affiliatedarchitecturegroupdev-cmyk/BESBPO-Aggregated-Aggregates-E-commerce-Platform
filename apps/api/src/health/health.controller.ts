import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../common/auth/decorators";
import { PrismaService } from "../common/prisma.service";
import { PricingService } from "../pricing/pricing.service";

/**
 * Render's health check (healthCheckPath in render.yaml). Fails only when the
 * database is unreachable; the pricing service's state is reported alongside
 * so a deploy can be diagnosed from one request.
 */
@Public()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  @Get()
  async check() {
    const pricing = await this.pricingService.health().catch((error: Error) => ({ status: "unreachable", error: error.message }));
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new ServiceUnavailableException({ status: "error", database: "unreachable", pricing });
    }
    return { status: "ok", database: "ok", pricing };
  }
}
