import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import type { NewsletterSubscriber } from "@aggregates/database";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../common/prisma.service";
import { newsletterConfirmationEmail } from "../notifications/account-emails";
import { siteUrl } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { ListmonkClient, ListmonkError } from "./listmonk";
import { SubscribeDto } from "./newsletter.dto";

const newToken = () => randomBytes(24).toString("base64url");
/** One confirmation email per address per this long, so the form can't be used to flood someone's inbox. */
const RESEND_CONFIRMATION_AFTER_MS = 10 * 60_000;
/** Sign-ups never confirmed are deleted after this long (POPIA: keep no more than needed). */
const UNCONFIRMED_KEPT_DAYS = 30;
const SYNC_EVERY_MS = 60 * 60_000;

const masked = (email: string) => email.replace(/^(.).*(@.*)$/, "$1•••$2");

/**
 * Newsletter sign-ups from the strip above the footer, with double opt-in:
 * the sign-up is recorded with its consent, and nobody is emailed a
 * newsletter (or sent to Listmonk) until they click the confirmation link.
 * POPIA: each subscriber has a private unsubscribe token for the link in
 * every email; unsubscribing keeps the record (so they're never emailed again
 * by mistake) until staff erase it on request. Listmonk (docs/email.md) gets
 * confirmed subscribers and their unsubscribes; unsubscribes made in Listmonk
 * are pulled back every hour.
 */
@Injectable()
export class NewsletterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NewsletterService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly listmonk: ListmonkClient,
  ) {}

  onModuleInit() {
    if (process.env.LISTMONK_SYNC === "off" || process.env.NODE_ENV === "test") return;
    this.timer = setInterval(() => void this.reconcile().catch((error: Error) => this.logger.warn(`Newsletter sync: ${error.message}`)), SYNC_EVERY_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async subscribe(dto: SubscribeDto) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email: dto.email } });
    const data = { name: dto.name ?? existing?.name ?? null, audience: dto.audience, province: dto.province ?? existing?.province ?? null, source: dto.source ?? null };
    if (!existing) {
      const created = await this.prisma.newsletterSubscriber.create({
        data: { ...data, email: dto.email, consentAt: new Date(), unsubscribeToken: newToken(), confirmToken: newToken() },
      });
      await this.sendConfirmation(created);
    } else if (existing.confirmedAt && !existing.unsubscribedAt) {
      // Already subscribed: just keep their details current.
      const updated = await this.prisma.newsletterSubscriber.update({ where: { id: existing.id }, data });
      await this.push(updated);
    } else {
      // Not confirmed yet, or unsubscribed and signing up again: fresh consent, confirmed by email again.
      const updated = await this.prisma.newsletterSubscriber.update({
        where: { id: existing.id },
        data: { ...data, consentAt: new Date(), ...(existing.unsubscribedAt ? { confirmedAt: null } : {}), confirmToken: existing.confirmToken ?? newToken() },
      });
      await this.sendConfirmation(updated);
    }
    // The same answer either way, so the form can't be used to test whether an address is subscribed.
    return { subscribed: true, confirmationRequired: true };
  }

  /** The link in the confirmation email. */
  async confirm(token: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({ where: { confirmToken: token } });
    if (!subscriber) throw new NotFoundException("This confirmation link isn't valid — it may already have been used. Sign up again to get a new one.");
    const confirmed = await this.prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: { confirmedAt: new Date(), unsubscribedAt: null, confirmToken: null },
    });
    await this.push(confirmed);
    return { confirmed: true, email: masked(confirmed.email) };
  }

  async unsubscribe(token: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
    if (!subscriber) throw new NotFoundException("This unsubscribe link isn't valid.");
    await this.markUnsubscribed(subscriber);
    return { unsubscribed: true, email: masked(subscriber.email) };
  }

  /** A spam complaint (Resend webhook): stop the newsletter for that address. */
  async unsubscribeByEmail(email: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (subscriber) await this.markUnsubscribed(subscriber);
  }

  async list(status: "active" | "pending" | "unsubscribed" | "all" = "active") {
    const ACTIVE = { unsubscribedAt: null, confirmedAt: { not: null } };
    const PENDING = { unsubscribedAt: null, confirmedAt: null };
    const where = status === "active" ? ACTIVE : status === "pending" ? PENDING : status === "unsubscribed" ? { unsubscribedAt: { not: null } } : {};
    const [subscribers, active, pending, unsubscribed, byAudience, unsynced] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: {
          id: true,
          email: true,
          name: true,
          audience: true,
          province: true,
          source: true,
          consentAt: true,
          confirmedAt: true,
          unsubscribedAt: true,
          createdAt: true,
          listmonkId: true,
          listmonkSyncedAt: true,
          listmonkError: true,
        },
      }),
      this.prisma.newsletterSubscriber.count({ where: ACTIVE }),
      this.prisma.newsletterSubscriber.count({ where: PENDING }),
      this.prisma.newsletterSubscriber.count({ where: { unsubscribedAt: { not: null } } }),
      this.prisma.newsletterSubscriber.groupBy({ by: ["audience"], where: ACTIVE, _count: true }),
      this.prisma.newsletterSubscriber.count({ where: { ...ACTIVE, listmonkSyncedAt: null } }),
    ]);
    return {
      subscribers,
      active,
      pending,
      unsubscribed,
      byAudience: Object.fromEntries(byAudience.map((a) => [a.audience, a._count])),
      listmonk: { ...this.listmonk.status(), unsynced },
    };
  }

  /** Confirmed, active subscribers as CSV, with each one's unsubscribe link for the email tool. */
  async exportCsv(site = siteUrl()) {
    const rows = await this.prisma.newsletterSubscriber.findMany({ where: { unsubscribedAt: null, confirmedAt: { not: null } }, orderBy: { createdAt: "asc" } });
    const cell = (value: string | null) => {
      const text = value ?? "";
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text; // keep spreadsheet formulas out
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const lines = [
      "email,name,audience,province,consent_at,confirmed_at,unsubscribe_url",
      ...rows.map((r) =>
        [r.email, r.name, r.audience, r.province, r.consentAt.toISOString(), r.confirmedAt?.toISOString() ?? "", this.unsubscribeUrl(r, site)].map(cell).join(","),
      ),
    ];
    return lines.join("\n") + "\n";
  }

  async erase(id: string) {
    const found = await this.prisma.newsletterSubscriber.findUnique({ where: { id }, select: { id: true, listmonkId: true } });
    if (!found) throw new NotFoundException("Subscriber not found.");
    // POPIA erasure covers Listmonk's copy too.
    if (found.listmonkId && this.listmonk.status().live) await this.listmonk.remove(found.listmonkId);
    await this.prisma.newsletterSubscriber.delete({ where: { id } });
  }

  /**
   * The full two-way sync (hourly, and "Sync now" on Admin → Newsletter):
   * unsubscribes made in Listmonk come back here, confirmed subscribers not yet
   * in Listmonk (or whose last push failed) go there, and sign-ups never
   * confirmed are deleted after 30 days.
   */
  async reconcile() {
    const purged = await this.prisma.newsletterSubscriber.deleteMany({
      where: { confirmedAt: null, unsubscribedAt: null, consentAt: { lt: new Date(Date.now() - UNCONFIRMED_KEPT_DAYS * 86_400_000) } },
    });
    if (!this.listmonk.status().live) return { live: false, pulledUnsubscribes: 0, pushed: 0, failed: 0, purgedUnconfirmed: purged.count };

    let pulledUnsubscribes = 0;
    const ours = new Set(this.listmonk.listIds());
    for await (const remote of this.listmonk.subscribers()) {
      const onOurLists = remote.lists.filter((l) => ours.has(l.id));
      const gone = remote.status === "blocklisted" || (onOurLists.length > 0 && onOurLists.every((l) => l.subscription_status === "unsubscribed"));
      if (!gone) continue;
      const local = await this.prisma.newsletterSubscriber.findUnique({ where: { email: remote.email.toLowerCase() } });
      // A re-subscription confirmed here but not yet pushed is newer than Listmonk's state: keep it.
      const newerHere = local?.confirmedAt && (!local.listmonkSyncedAt || local.confirmedAt > local.listmonkSyncedAt);
      if (local && !local.unsubscribedAt && !newerHere) {
        await this.prisma.newsletterSubscriber.update({ where: { id: local.id }, data: { unsubscribedAt: new Date(), listmonkId: remote.id, listmonkSyncedAt: new Date(), listmonkError: null } });
        pulledUnsubscribes++;
      }
    }

    const due = await this.prisma.newsletterSubscriber.findMany({
      where: { unsubscribedAt: null, confirmedAt: { not: null }, OR: [{ listmonkSyncedAt: null }, { listmonkError: { not: null } }] },
      take: 1000,
    });
    let pushed = 0;
    for (const s of due) if (await this.push(s)) pushed++;
    return { live: true, pulledUnsubscribes, pushed, failed: due.length - pushed, purgedUnconfirmed: purged.count };
  }

  // -------------------------------------------------------------------------

  private unsubscribeUrl(s: Pick<NewsletterSubscriber, "unsubscribeToken">, site = siteUrl()) {
    return `${site}/newsletter/unsubscribe?token=${s.unsubscribeToken}`;
  }

  private async sendConfirmation(s: NewsletterSubscriber) {
    if (s.confirmSentAt && Date.now() - s.confirmSentAt.getTime() < RESEND_CONFIRMATION_AFTER_MS) return;
    if (!s.confirmToken) return;
    await this.prisma.newsletterSubscriber.update({ where: { id: s.id }, data: { confirmSentAt: new Date() } });
    await this.notifications
      .system("NEWSLETTER_CONFIRMATION", s.email, newsletterConfirmationEmail(s.name, `${siteUrl()}/newsletter/confirm?token=${s.confirmToken}`))
      .catch((error: Error) => this.logger.warn(`Newsletter confirmation not sent: ${error.message}`));
  }

  private async markUnsubscribed(s: NewsletterSubscriber) {
    if (!s.unsubscribedAt) {
      await this.prisma.newsletterSubscriber.update({ where: { id: s.id }, data: { unsubscribedAt: new Date(), confirmToken: null } });
    }
    if (s.listmonkId && this.listmonk.status().live) {
      await this.listmonk
        .blocklist(s.listmonkId)
        .then(() => this.prisma.newsletterSubscriber.update({ where: { id: s.id }, data: { listmonkSyncedAt: new Date(), listmonkError: null } }))
        .catch((error: Error) => this.prisma.newsletterSubscriber.update({ where: { id: s.id }, data: { listmonkError: error.message.slice(0, 300) } }));
    }
  }

  /** Sends one confirmed, active subscriber to Listmonk. A failure is recorded and retried by the hourly sync. */
  private async push(s: NewsletterSubscriber): Promise<boolean> {
    if (!s.confirmedAt || s.unsubscribedAt || !this.listmonk.status().live) return false;
    try {
      const id = await this.listmonk.upsert(
        {
          email: s.email,
          name: s.name,
          attribs: {
            audience: s.audience,
            province: s.province,
            source: s.source,
            consent_at: s.consentAt.toISOString(),
            confirmed_at: s.confirmedAt.toISOString(),
            // Campaign templates use this, so unsubscribing is recorded here first (docs/email.md).
            unsubscribe_url: this.unsubscribeUrl(s),
          },
        },
        s.listmonkId,
      );
      await this.prisma.newsletterSubscriber.update({ where: { id: s.id }, data: { listmonkId: id, listmonkSyncedAt: new Date(), listmonkError: null } });
      return true;
    } catch (error) {
      const message = error instanceof ListmonkError ? error.message : (error as Error).message;
      await this.prisma.newsletterSubscriber.update({ where: { id: s.id }, data: { listmonkError: message.slice(0, 300) } });
      return false;
    }
  }
}
