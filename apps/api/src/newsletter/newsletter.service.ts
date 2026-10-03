import { Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../common/prisma.service";
import { SubscribeDto } from "./newsletter.dto";

const newToken = () => randomBytes(24).toString("base64url");

/**
 * Newsletter sign-ups from the strip above the footer. POPIA: every
 * subscriber gave consent (consentAt); each has a private unsubscribe token
 * for the link in every email; unsubscribing keeps the record (so they're
 * never emailed again by mistake) until staff erase it on request.
 */
@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(dto: SubscribeDto) {
    const existing = await this.prisma.newsletterSubscriber.findUnique({ where: { email: dto.email } });
    const data = { name: dto.name ?? existing?.name ?? null, audience: dto.audience, province: dto.province ?? existing?.province ?? null, source: dto.source ?? null };
    if (!existing) {
      await this.prisma.newsletterSubscriber.create({ data: { ...data, email: dto.email, consentAt: new Date(), unsubscribeToken: newToken() } });
    } else if (existing.unsubscribedAt) {
      // Signing up again is fresh consent.
      await this.prisma.newsletterSubscriber.update({ where: { id: existing.id }, data: { ...data, consentAt: new Date(), unsubscribedAt: null } });
    } else {
      await this.prisma.newsletterSubscriber.update({ where: { id: existing.id }, data });
    }
    // The same answer either way, so the form can't be used to test whether an address is subscribed.
    return { subscribed: true };
  }

  async unsubscribe(token: string) {
    const subscriber = await this.prisma.newsletterSubscriber.findUnique({ where: { unsubscribeToken: token } });
    if (!subscriber) throw new NotFoundException("This unsubscribe link isn't valid.");
    if (!subscriber.unsubscribedAt) {
      await this.prisma.newsletterSubscriber.update({ where: { id: subscriber.id }, data: { unsubscribedAt: new Date() } });
    }
    return { unsubscribed: true, email: subscriber.email.replace(/^(.).*(@.*)$/, "$1•••$2") };
  }

  async list(status: "active" | "unsubscribed" | "all" = "active") {
    const where = status === "active" ? { unsubscribedAt: null } : status === "unsubscribed" ? { unsubscribedAt: { not: null } } : {};
    const [subscribers, active, unsubscribed, byAudience] = await Promise.all([
      this.prisma.newsletterSubscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 1000,
        select: { id: true, email: true, name: true, audience: true, province: true, source: true, consentAt: true, unsubscribedAt: true, createdAt: true },
      }),
      this.prisma.newsletterSubscriber.count({ where: { unsubscribedAt: null } }),
      this.prisma.newsletterSubscriber.count({ where: { unsubscribedAt: { not: null } } }),
      this.prisma.newsletterSubscriber.groupBy({ by: ["audience"], where: { unsubscribedAt: null }, _count: true }),
    ]);
    return { subscribers, active, unsubscribed, byAudience: Object.fromEntries(byAudience.map((a) => [a.audience, a._count])) };
  }

  /** Active subscribers as CSV, with each one's unsubscribe link for the email tool. */
  async exportCsv(siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aggregates.store").replace(/\/+$/, "")) {
    const rows = await this.prisma.newsletterSubscriber.findMany({ where: { unsubscribedAt: null }, orderBy: { createdAt: "asc" } });
    const cell = (value: string | null) => {
      const text = value ?? "";
      const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text; // keep spreadsheet formulas out
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
    };
    const lines = [
      "email,name,audience,province,consent_at,unsubscribe_url",
      ...rows.map((r) =>
        [r.email, r.name, r.audience, r.province, r.consentAt.toISOString(), `${siteUrl}/newsletter/unsubscribe?token=${r.unsubscribeToken}`].map(cell).join(","),
      ),
    ];
    return lines.join("\n") + "\n";
  }

  async erase(id: string) {
    const found = await this.prisma.newsletterSubscriber.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException("Subscriber not found.");
    await this.prisma.newsletterSubscriber.delete({ where: { id } });
  }
}
