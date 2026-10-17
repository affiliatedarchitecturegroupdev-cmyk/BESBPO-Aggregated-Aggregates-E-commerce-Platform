import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PaymentGateway } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { gatewayDegradedEmail } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";

/** Failover (docs/payments.md): this many errors starting payments, within the window, trips a gateway. */
export const TRIP = { errors: 3, windowMs: 10 * 60_000, coolOffMs: 15 * 60_000 };

export const GATEWAY_LABEL: Record<PaymentGateway, string> = {
  PAYFAST: "PayFast",
  PEACH: "Peach Payments",
  OZOW_DIRECT: "Ozow",
  STITCH_DIRECT: "Stitch",
  LULAPAY_DIRECT: "Lulapay",
  MANUAL_EFT: "EFT / purchase order",
  LAYUP: "LayUp",
};

/**
 * Which gateways are healthy. A gateway that fails to start payments
 * repeatedly (an error from the provider, not "not configured") is tripped
 * for a cool-off: its methods go straight to their fallback gateway, staff
 * are emailed, and after the cool-off it's tried again. Admins can also
 * pause a gateway by hand (e.g. during a provider's announced outage) and
 * resume it. Incidents are kept as a history on Admin → Payments.
 */
@Injectable()
export class GatewayHealthService {
  private readonly logger = new Logger(GatewayHealthService.name);
  private readonly failures = new Map<PaymentGateway, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The time health is judged against (tests move it on). */
  clock: () => Date = () => new Date();

  /** The open incident for a gateway, if it's down right now. An automatic trip ends itself after the cool-off. */
  async downIncident(gateway: PaymentGateway) {
    const open = await this.prisma.gatewayIncident.findFirst({ where: { gateway, endedAt: null }, orderBy: { startedAt: "desc" } });
    if (!open) return null;
    if (open.automatic && this.clock().getTime() - open.startedAt.getTime() >= TRIP.coolOffMs) {
      await this.prisma.gatewayIncident.update({ where: { id: open.id }, data: { endedAt: this.clock() } });
      this.failures.delete(gateway);
      return null;
    }
    return open;
  }

  async recordFailure(gateway: PaymentGateway, reason: string) {
    const now = this.clock().getTime();
    const recent = [...(this.failures.get(gateway) ?? []).filter((t) => now - t < TRIP.windowMs), now];
    this.failures.set(gateway, recent);
    this.logger.warn(`${GATEWAY_LABEL[gateway]} failed to start a payment (${recent.length} in ${TRIP.windowMs / 60_000} min): ${reason}`);
    if (recent.length < TRIP.errors || (await this.downIncident(gateway))) return;
    const incident = await this.prisma.gatewayIncident.create({ data: { gateway, reason: reason.slice(0, 500), automatic: true, startedAt: this.clock() } });
    await this.alert(incident.gateway, incident.reason, incident.startedAt, new Date(incident.startedAt.getTime() + TRIP.coolOffMs));
  }

  recordSuccess(gateway: PaymentGateway) {
    this.failures.delete(gateway);
  }

  /** Admin: stop sending payments to a gateway until it's resumed. */
  async pause(gateway: PaymentGateway, reason: string) {
    if (gateway === "MANUAL_EFT") throw new BadRequestException("EFT / purchase order has no provider to pause.");
    const open = await this.prisma.gatewayIncident.findFirst({ where: { gateway, endedAt: null } });
    if (open && !open.automatic) return open;
    if (open) await this.prisma.gatewayIncident.update({ where: { id: open.id }, data: { endedAt: this.clock() } });
    const incident = await this.prisma.gatewayIncident.create({ data: { gateway, reason: reason.trim().slice(0, 500) || "Paused by an admin", automatic: false, startedAt: this.clock() } });
    await this.alert(gateway, incident.reason, incident.startedAt, null);
    return incident;
  }

  /** Admin: send payments to a gateway again (ends an automatic trip early too). */
  async resume(gateway: PaymentGateway) {
    await this.prisma.gatewayIncident.updateMany({ where: { gateway, endedAt: null }, data: { endedAt: this.clock() } });
    this.failures.delete(gateway);
    return { gateway, resumed: true };
  }

  async overview() {
    const gateways = await Promise.all(
      Object.values(PaymentGateway).map(async (gateway) => {
        const incident = await this.downIncident(gateway);
        const now = this.clock().getTime();
        return {
          gateway,
          label: GATEWAY_LABEL[gateway],
          down: Boolean(incident),
          incident,
          recentErrors: (this.failures.get(gateway) ?? []).filter((t) => now - t < TRIP.windowMs).length,
        };
      }),
    );
    const history = await this.prisma.gatewayIncident.findMany({ orderBy: { startedAt: "desc" }, take: 20 });
    return { gateways, history, trip: TRIP };
  }

  private async alert(gateway: PaymentGateway, reason: string, startedAt: Date, until: Date | null) {
    const configs = await this.prisma.paymentMethodConfig.findMany({ where: { activeGateway: gateway, isEnabled: true }, orderBy: { sortOrder: "asc" } });
    const fallbacks = configs.map((c) => `${c.displayName} → ${c.fallbackGateway ? GATEWAY_LABEL[c.fallbackGateway] : "no fallback (can't be paid online meanwhile)"}`);
    await this.notifications.staffAlert("GATEWAY_DEGRADED", gatewayDegradedEmail({ gateway: GATEWAY_LABEL[gateway], reason, startedAt, until, fallbacks }));
  }
}
