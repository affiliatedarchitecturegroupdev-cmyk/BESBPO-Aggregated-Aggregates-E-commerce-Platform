import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../common/auth/decorators";
import { PrismaService } from "../common/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import { UptimeService } from "./uptime.service";

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
    private readonly uptime: UptimeService,
  ) {}

  /**
   * Every dependency: database, pricing service, file storage. 503 if any
   * fails, so an outside monitor can alert on it. Error details stay in the
   * logs (and the staff email) — only up/down and timings are public.
   */
  @Get("deep")
  async deep() {
    const results = await this.uptime.checks();
    const body = { status: results.every((r) => r.ok) ? "ok" : "degraded", checks: Object.fromEntries(results.map((r) => [r.name, { ok: r.ok, ms: r.ms }])) };
    if (body.status !== "ok") throw new ServiceUnavailableException(body);
    return body;
  }

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
