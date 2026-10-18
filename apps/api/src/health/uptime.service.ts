import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { serviceDownEmail } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { PricingService } from "../pricing/pricing.service";
import { StorageService } from "../storage/storage.service";
import { nextState, type ComponentState } from "./uptime";

export type Check = { name: string; label: string; ok: boolean; ms: number; error?: string };
const EVERY_MS = 5 * 60_000;

/**
 * Deep health (docs/uptime.md): the database, the pricing service and file
 * storage, each with a timeout. Every five minutes the API checks itself and
 * emails staff (SERVICE_DOWN) when something has failed twice in a row, and
 * again when it recovers. UPTIME_MONITOR=off stops the timer; an outside
 * monitor (the GitHub Actions uptime workflow) covers the API being down
 * altogether.
 */
@Injectable()
export class UptimeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UptimeService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly states = new Map<string, ComponentState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    if (process.env.UPTIME_MONITOR === "off" || process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.monitor().catch((error: Error) => this.logger.warn(`Uptime check: ${error.message}`)), EVERY_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async checks(): Promise<Check[]> {
    const timed = async (name: string, label: string, run: () => Promise<unknown>): Promise<Check> => {
      const start = Date.now();
      try {
        await Promise.race([run(), new Promise((_, reject) => setTimeout(() => reject(new Error("timed out after 5s")), 5000))]);
        return { name, label, ok: true, ms: Date.now() - start };
      } catch (error) {
        return { name, label, ok: false, ms: Date.now() - start, error: (error as Error).message.slice(0, 200) };
      }
    };
    const list = [timed("database", "Database", () => this.prisma.$queryRaw`SELECT 1`), timed("pricing", "Pricing service", () => this.pricing.health())];
    if (this.storage.configured) list.push(timed("storage", "File storage", () => this.storage.probe()));
    return Promise.all(list);
  }

  /** One round of the monitor: check, then email staff about anything newly down or recovered. */
  async monitor() {
    const results = await this.checks();
    const down: string[] = [];
    const recovered: string[] = [];
    for (const r of results) {
      const { state, alert } = nextState(this.states.get(r.name), r.ok);
      this.states.set(r.name, state);
      if (alert === "DOWN") down.push(r.label);
      if (alert === "RECOVERED") recovered.push(r.label);
    }
    if (down.length || recovered.length) {
      const detail = results.map((r) => [r.label, r.ok ? `OK (${r.ms} ms)` : `FAILING — ${r.error ?? "no answer"}`] as [string, string]);
      this.logger.warn(`Uptime: down [${down.join(", ")}] recovered [${recovered.join(", ")}]`);
      await this.notifications.staffAlert("SERVICE_DOWN", serviceDownEmail({ down, recovered, detail, at: new Date() }));
    }
    return { results, down, recovered };
  }
}
