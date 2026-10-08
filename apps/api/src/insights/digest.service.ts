import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { digestDue, previousWeek, weeklyInsightsEmail, type DigestData } from "./digest";
import { InsightsService } from "./insights.service";

/**
 * The weekly insights email to admins (ANALYTICS.md, Phase 4). Every ten
 * minutes the scheduler checks whether last week's email is due (from Monday
 * 07:00 SAST) and not yet sent. A week is claimed in InsightsDigest before
 * sending, so a second API instance — or a restart — can't send it twice.
 * INSIGHTS_DIGEST=off disables the schedule (admins can still preview and
 * send it to themselves).
 */
@Injectable()
export class DigestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DigestService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    if (process.env.INSIGHTS_DIGEST === "off" || process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.tick(), 10 * 60_000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.sendIfDue();
    } catch (error) {
      this.logger.error(`Weekly insights email failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** Builds last week's figures (or the week given) — whole business, unfiltered. */
  async data(week = previousWeek()): Promise<DigestData> {
    const q = { from: week.from, to: week.to, compare: "previous" as const };
    const [summary, products, provinces] = await Promise.all([
      this.insights.summary(q),
      this.insights.breakdown({ ...q, by: "product", limit: 5, compare: "none" }),
      this.insights.breakdown({ ...q, by: "province", limit: 3, compare: "none" }),
    ]);
    return {
      from: week.from,
      to: week.to,
      vatBasis: summary.vatBasis,
      current: summary.current,
      previous: summary.previous,
      products: products.rows.map((r) => ({ label: r.label, detail: r.detail, revenue: r.revenue, share: r.share })),
      provinces: provinces.rows.map((r) => ({ label: r.label, revenue: r.revenue, share: r.share })),
      pipeline: summary.pipeline,
    };
  }

  async preview(week = previousWeek()) {
    const message = weeklyInsightsEmail(await this.data(week));
    const [log, recipients] = await Promise.all([this.prisma.insightsDigest.findMany({ orderBy: { weekStart: "desc" }, take: 8 }), this.adminEmails()]);
    return { week, recipients, ...message, history: log };
  }

  /** Admin: send last week's email now, to yourself only (doesn't count as the week's send). */
  async sendToMe(user: AuthUser) {
    const admin = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true } });
    const queued = await this.notifications.adminDigest("WEEKLY_INSIGHTS", [admin.email], weeklyInsightsEmail(await this.data()));
    return { queued, to: admin.email };
  }

  /** Sends last week's email to every admin if it's due and no instance has claimed it yet. */
  async sendIfDue(now: Date = new Date()): Promise<{ sent: boolean; reason?: string; recipients?: number }> {
    if (!digestDue(now)) return { sent: false, reason: "not-due" };
    const week = previousWeek(now);
    const weekStart = new Date(`${week.from}T00:00:00Z`);
    try {
      await this.prisma.insightsDigest.create({ data: { weekStart } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { sent: false, reason: "already-sent" };
      throw error;
    }
    try {
      const recipients = await this.notifications.adminDigest("WEEKLY_INSIGHTS", await this.adminEmails(), weeklyInsightsEmail(await this.data(week)));
      await this.prisma.insightsDigest.update({ where: { weekStart }, data: { sentAt: new Date(), recipients } });
      return { sent: recipients > 0, reason: recipients ? undefined : "switched-off-or-no-admins", recipients };
    } catch (error) {
      await this.prisma.insightsDigest.update({ where: { weekStart }, data: { error: (error as Error).message.slice(0, 500) } });
      throw error;
    }
  }

  private async adminEmails() {
    const admins = await this.prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true }, orderBy: { createdAt: "asc" } });
    return admins.map((a) => a.email);
  }
}
