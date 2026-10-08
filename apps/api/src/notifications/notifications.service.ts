import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { NotificationAudience, NotificationChannel, NotificationEvent, NotificationStatus, Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import {
  customerCompanyEmail,
  customerBookingEmail,
  customerEnquiryEmail,
  customerOrderEmail,
  customerOrderWhatsApp,
  customerQuoteEmail,
  customerQuoteWhatsApp,
  EVENT_CHANNELS,
  EVENT_LABEL,
  staffCompanyEmail,
  partnerBookingEmail,
  PARTNER_EVENTS,
  staffBookingEmail,
  staffEnquiryEmail,
  staffOrderEmail,
  staffQuoteEmail,
  whatsappNumber,
  type CompanyData,
  type EmailMessage,
  type BookingData,
  type EnquiryData,
  type OrderData,
  type QuoteData,
  type WhatsAppMessage,
} from "./notification-templates";
import { EmailSender, WhatsAppTemplateSender, type SendResult } from "./providers";

type Setting = { customerEmail: boolean; customerWhatsApp: boolean; staffEmail: boolean };
type Outgoing = {
  audience: NotificationAudience;
  channel: NotificationChannel;
  recipient: string;
  email?: EmailMessage;
  whatsapp?: WhatsAppMessage;
};
type Links = { orderId?: string; quoteId?: string; companyId?: string; enquiryId?: string; bookingId?: string };

const BASIS_UNITS: Record<string, [string, string]> = {
  DAY: ["day", "days"],
  WEEK: ["week", "weeks"],
  LOAD: ["load", "loads"],
  SKIP: ["skip", "skips"],
  M2: ["m²", "m²"],
  JOB: ["job", "jobs"],
};
const BASIS_LABEL = (basis: string, quantity: number) => {
  const [one, many] = BASIS_UNITS[basis] ?? ["", ""];
  return `${quantity} ${quantity === 1 ? one : many}`.trim();
};

const ENQUIRY_KIND_LABEL: Record<string, string> = {
  PLANT_HIRE: "Plant hire",
  SITE_SERVICE: "Site service",
  BUSINESS_LINE: "Supply",
  JOB_PACK: "Job pack",
  ESTIMATE: "Project estimate",
  PARTNER_APPLICATION: "Partner application",
};

const TIER_LABEL: Record<string, string> = { RETAIL: "Retail", CONTRACTOR_TRADE: "Contractor/Trade", VOLUME_CIVIL_BULK: "Volume/Civil Bulk" };
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/**
 * Transactional notifications. Services call `order`, `quote`, `company` or `enquiry`
 * after a change is saved; this decides who hears about it on which channel
 * (EVENT_CHANNELS, narrowed by the admin settings and the customer's own
 * WhatsApp opt-in), records every message, then delivers in the background.
 * A notification problem never fails the order, quote or review that caused it.
 */
@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly inFlight = new Set<Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailSender: EmailSender,
    private readonly whatsappSender: WhatsAppTemplateSender,
  ) {}

  async onModuleDestroy() {
    await Promise.allSettled([...this.inFlight]);
  }

  // -------------------------------------------------------------------------
  // Events
  // -------------------------------------------------------------------------

  async order(event: NotificationEvent, orderId: string) {
    await this.safely(event, async () => {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          lineItems: { include: { product: { select: { name: true } } } },
          shipment: true,
          user: { select: { email: true, name: true } },
          company: { select: { name: true } },
        },
      });
      if (!order) return;
      const data: OrderData = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        total: order.total,
        deliveryAddress: order.deliveryAddress,
        deliveryProvince: order.deliveryProvince,
        deliveryDistanceKm: order.deliveryDistanceKm,
        customerName: order.user?.name ?? null,
        companyName: order.company?.name ?? null,
        lines: order.lineItems.map((l) => ({ name: l.product.name, quantity: l.quantity, unitOfSale: l.unitOfSale, lineTotal: l.lineTotal })),
        shipment: order.shipment,
      };
      const setting = await this.setting(event);
      const out: Outgoing[] = [];
      const customerEmail = setting.customerEmail && order.user?.email ? customerOrderEmail(event, data) : null;
      if (customerEmail) out.push({ audience: "CUSTOMER", channel: "EMAIL", recipient: order.user!.email, email: customerEmail });
      const phone = order.whatsappUpdates ? whatsappNumber(order.contactPhone) : null;
      const message = setting.customerWhatsApp && phone ? customerOrderWhatsApp(event, data) : null;
      if (message) out.push({ audience: "CUSTOMER", channel: "WHATSAPP", recipient: phone!, whatsapp: message });
      const staff = setting.staffEmail ? staffOrderEmail(event, data) : null;
      if (staff) out.push(...(await this.staffRecipients()).map((recipient) => ({ audience: "STAFF" as const, channel: "EMAIL" as const, recipient, email: staff })));
      await this.enqueue(event, out, { orderId: order.id, companyId: order.companyId ?? undefined });
    });
  }

  async quote(event: NotificationEvent, quoteId: string) {
    await this.safely(event, async () => {
      const quote = await this.prisma.quote.findUnique({
        where: { id: quoteId },
        include: { lineItems: { include: { product: { select: { name: true } } } }, user: { select: { email: true, name: true } } },
      });
      if (!quote) return;
      const data: QuoteData = {
        id: quote.id,
        reference: quote.reference,
        contactName: quote.contactName ?? quote.user?.name ?? null,
        companyName: quote.companyName,
        projectName: quote.projectName,
        deliveryAddress: quote.deliveryAddress,
        estimatedSubtotal: quote.estimatedSubtotal,
        quotedTotal: quote.quotedTotal,
        staffNotes: quote.staffNotes,
        reasons: quote.reasons,
        hasAccount: quote.userId !== null,
        lines: quote.lineItems.map((l) => ({ name: l.product.name, quantity: l.quantity, unitOfSale: l.unitOfSale })),
      };
      const setting = await this.setting(event);
      const out: Outgoing[] = [];
      const to = quote.contactEmail ?? quote.user?.email ?? null;
      const customerEmail = setting.customerEmail && to ? customerQuoteEmail(event, data) : null;
      if (customerEmail) out.push({ audience: "CUSTOMER", channel: "EMAIL", recipient: to!, email: customerEmail });
      const phone = quote.whatsappUpdates ? whatsappNumber(quote.contactPhone) : null;
      const message = setting.customerWhatsApp && phone ? customerQuoteWhatsApp(event, data) : null;
      if (message) out.push({ audience: "CUSTOMER", channel: "WHATSAPP", recipient: phone!, whatsapp: message });
      const staff = setting.staffEmail ? staffQuoteEmail(event, data) : null;
      if (staff) out.push(...(await this.staffRecipients()).map((recipient) => ({ audience: "STAFF" as const, channel: "EMAIL" as const, recipient, email: staff })));
      await this.enqueue(event, out, { quoteId: quote.id, companyId: quote.companyId ?? undefined });
    });
  }

  async company(event: NotificationEvent, companyId: string) {
    await this.safely(event, async () => {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        include: { tier: true, requestedTier: true, users: { select: { email: true, name: true, role: true }, orderBy: { createdAt: "asc" } } },
      });
      if (!company) return;
      // The applicant administers the company; tell the company admins (or, failing that, its users).
      const admins = company.users.filter((u) => u.role === "COMPANY_ADMIN");
      const people = admins.length ? admins : company.users;
      const data: CompanyData = {
        id: company.id,
        name: company.name,
        applicantName: people[0]?.name ?? null,
        applicantEmail: people[0]?.email ?? null,
        tierLabel: TIER_LABEL[company.tier.name] ?? company.tier.name,
        requestedTierLabel: company.requestedTier ? (TIER_LABEL[company.requestedTier.name] ?? company.requestedTier.name) : null,
        reviewNotes: company.reviewNotes,
      };
      const setting = await this.setting(event);
      const out: Outgoing[] = [];
      for (const person of people) {
        const message = setting.customerEmail ? customerCompanyEmail(event, { ...data, applicantName: person.name }) : null;
        if (message) out.push({ audience: "CUSTOMER", channel: "EMAIL", recipient: person.email, email: message });
      }
      const staff = setting.staffEmail ? staffCompanyEmail(event, data) : null;
      if (staff) out.push(...(await this.staffRecipients()).map((recipient) => ({ audience: "STAFF" as const, channel: "EMAIL" as const, recipient, email: staff })));
      await this.enqueue(event, out, { companyId: company.id });
    });
  }

  async enquiry(event: NotificationEvent, enquiryId: string) {
    await this.safely(event, async () => {
      const e = await this.prisma.enquiry.findUnique({ where: { id: enquiryId } });
      if (!e) return;
      const details = e.details && typeof e.details === "object" && !Array.isArray(e.details) ? (e.details as Record<string, unknown>) : {};
      const data: EnquiryData = {
        id: e.id,
        reference: e.reference,
        kindLabel: ENQUIRY_KIND_LABEL[e.kind] ?? "General",
        subject: e.subject,
        contactName: e.contactName,
        contactEmail: e.contactEmail,
        contactPhone: e.contactPhone,
        companyName: e.companyName,
        province: e.province,
        siteAddress: e.siteAddress,
        message: e.message,
        details: Object.entries(details).map(([k, v]) => [k, String(v)] as [string, string]),
      };
      const setting = await this.setting(event);
      const out: Outgoing[] = [];
      const customer = setting.customerEmail ? customerEnquiryEmail(event, data) : null;
      if (customer && EMAIL_PATTERN.test(e.contactEmail)) out.push({ audience: "CUSTOMER", channel: "EMAIL", recipient: e.contactEmail, email: customer });
      const staff = setting.staffEmail ? staffEnquiryEmail(event, data) : null;
      if (staff) out.push(...(await this.staffRecipients()).map((recipient) => ({ audience: "STAFF" as const, channel: "EMAIL" as const, recipient, email: staff })));
      await this.enqueue(event, out, { enquiryId: e.id });
    });
  }

  async booking(event: NotificationEvent, bookingId: string, extra: { disputeReason?: string; partnerId?: string } = {}) {
    await this.safely(event, async () => {
      const b = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: { select: { email: true, name: true } }, assignedPartner: { include: { users: { select: { email: true } } } } },
      });
      if (!b) return;
      const day = (d: Date) => d.toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      const data: BookingData = {
        id: b.id,
        reference: b.reference,
        itemName: b.itemName,
        status: b.status,
        customerName: b.user.name,
        partnerName: b.assignedPartner?.name ?? null,
        province: b.province,
        siteAddress: b.siteAddress,
        startDate: day(b.startDate),
        endDate: day(b.endDate),
        quantityLabel: BASIS_LABEL(b.basis, b.quantity),
        customerTotal: b.customerTotal,
        partnerAmount: b.partnerAmount,
        quoteValidUntil: b.quoteValidUntil ? day(b.quoteValidUntil) : null,
        disputeReason: extra.disputeReason ?? null,
      };
      const setting = await this.setting(event);
      const out: Outgoing[] = [];
      const customer = setting.customerEmail ? customerBookingEmail(event, data) : null;
      if (customer) out.push({ audience: "CUSTOMER", channel: "EMAIL", recipient: b.user.email, email: customer });
      const staff = setting.staffEmail ? staffBookingEmail(event, data) : null;
      if (staff) out.push(...(await this.staffRecipients()).map((recipient) => ({ audience: "STAFF" as const, channel: "EMAIL" as const, recipient, email: staff })));
      if (PARTNER_EVENTS.includes(event)) {
        // Offers go to the partner being offered the job; everything else to the assigned partner.
        const partner = event === "BOOKING_OFFERED" && extra.partnerId ? await this.prisma.hirePartner.findUnique({ where: { id: extra.partnerId }, include: { users: { select: { email: true } } } }) : b.assignedPartner;
        const message = partner ? partnerBookingEmail(event, data) : null;
        if (partner && message) {
          const recipients = [...new Set([partner.contactEmail, ...partner.users.map((u) => u.email)].map((e) => e.toLowerCase()).filter((e) => EMAIL_PATTERN.test(e)))];
          out.push(...recipients.map((recipient) => ({ audience: "PARTNER" as const, channel: "EMAIL" as const, recipient, email: message })));
        }
      }
      await this.enqueue(event, out, { bookingId: b.id });
    });
  }

  // -------------------------------------------------------------------------
  // Staff: log, resend, settings, recipients, status
  // -------------------------------------------------------------------------

  list(filter: { status?: NotificationStatus; event?: NotificationEvent; orderId?: string; quoteId?: string; take?: number }) {
    return this.prisma.notification.findMany({
      where: { status: filter.status, event: filter.event, orderId: filter.orderId, quoteId: filter.quoteId },
      orderBy: { createdAt: "desc" },
      take: Math.min(filter.take ?? 100, 200),
      select: {
        id: true,
        event: true,
        channel: true,
        audience: true,
        recipient: true,
        subject: true,
        body: true,
        templateName: true,
        status: true,
        provider: true,
        error: true,
        attempts: true,
        orderId: true,
        quoteId: true,
        companyId: true,
        createdAt: true,
        sentAt: true,
      },
    });
  }

  /**
   * An admin-only summary (the weekly insights email): one email per address,
   * logged like every other message. Skipped when switched off on
   * Admin → Notifications. Returns how many emails were queued.
   */
  async adminDigest(event: NotificationEvent, recipients: string[], message: EmailMessage): Promise<number> {
    if (!(await this.setting(event)).staffEmail) return 0;
    const to = [...new Set(recipients.map((r) => r.trim().toLowerCase()).filter((r) => EMAIL_PATTERN.test(r)))];
    await this.enqueue(
      event,
      to.map((recipient) => ({ audience: "STAFF", channel: "EMAIL", recipient, email: message })),
      {},
    );
    return to.length;
  }

  /** Staff: try a failed (or merely logged) message again — e.g. once a provider is configured. */
  async resend(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException("Notification not found.");
    if (notification.status === "SENT" || notification.status === "PENDING") {
      throw new BadRequestException(notification.status === "SENT" ? "This message was already sent." : "This message is still being sent.");
    }
    await this.prisma.notification.update({ where: { id }, data: { status: "PENDING", error: null } });
    return this.deliver(id);
  }

  async settings() {
    const rows = await this.prisma.notificationSetting.findMany();
    const saved = new Map(rows.map((r) => [r.event, r]));
    return Object.values(NotificationEvent).map((event) => {
      const row = saved.get(event);
      const available = EVENT_CHANNELS[event];
      return {
        event,
        label: EVENT_LABEL[event],
        available,
        customerEmail: available.customerEmail && (row?.customerEmail ?? true),
        customerWhatsApp: available.customerWhatsApp && (row?.customerWhatsApp ?? false),
        staffEmail: available.staffEmail && (row?.staffEmail ?? true),
      };
    });
  }

  async updateSetting(event: NotificationEvent, dto: Partial<Setting>) {
    const available = EVENT_CHANNELS[event];
    for (const key of ["customerEmail", "customerWhatsApp", "staffEmail"] as const) {
      if (dto[key] && !available[key]) throw new BadRequestException(`${EVENT_LABEL[event]} has no ${key} message.`);
    }
    const current = await this.setting(event);
    const next = { ...current, ...Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)) };
    await this.prisma.notificationSetting.upsert({ where: { event }, create: { event, ...next }, update: next });
    return (await this.settings()).find((s) => s.event === event);
  }

  async recipients() {
    const rows = await this.prisma.notificationRecipient.findMany({ orderBy: { createdAt: "asc" } });
    return { recipients: rows.map((r) => r.email), fromEnv: rows.length ? [] : this.envRecipients() };
  }

  async addRecipient(email: string) {
    const normalised = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalised)) throw new BadRequestException("Enter a valid email address.");
    await this.prisma.notificationRecipient.upsert({ where: { email: normalised }, create: { email: normalised }, update: {} });
    return this.recipients();
  }

  async removeRecipient(email: string) {
    await this.prisma.notificationRecipient.deleteMany({ where: { email: email.trim().toLowerCase() } });
    return this.recipients();
  }

  async status() {
    const [recipients, failed, logged] = await Promise.all([
      this.staffRecipients(),
      this.prisma.notification.count({ where: { status: "FAILED" } }),
      this.prisma.notification.count({ where: { status: "LOGGED" } }),
    ]);
    return { email: this.emailSender.status(), whatsapp: this.whatsappSender.status(), staffRecipientCount: recipients.length, failed, logged };
  }

  /** Admin: send a one-off test email to check the provider set-up (not recorded in the log). */
  async sendTest(to: string): Promise<SendResult> {
    const address = to.trim();
    if (!EMAIL_PATTERN.test(address)) throw new BadRequestException("Enter a valid email address.");
    const text = "This is a test email from the Aggregated Aggregates platform. If you can read it, email notifications are working.";
    return this.emailSender.send({
      to: address,
      subject: "Aggregated Aggregates — test email",
      text,
      html: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif"><p>${text}</p></body></html>`,
    });
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private async safely(event: NotificationEvent, work: () => Promise<void>) {
    try {
      await work();
    } catch (error) {
      this.logger.error(`Couldn't queue ${event} notifications: ${(error as Error).message}`);
    }
  }

  private async setting(event: NotificationEvent): Promise<Setting> {
    const row = await this.prisma.notificationSetting.findUnique({ where: { event } });
    return { customerEmail: row?.customerEmail ?? true, customerWhatsApp: row?.customerWhatsApp ?? false, staffEmail: row?.staffEmail ?? true };
  }

  private envRecipients(): string[] {
    return (process.env.STAFF_NOTIFICATION_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => EMAIL_PATTERN.test(e));
  }

  /** Staff inboxes from /admin/notifications, or STAFF_NOTIFICATION_EMAILS until any are added there. */
  private async staffRecipients(): Promise<string[]> {
    const rows = await this.prisma.notificationRecipient.findMany({ orderBy: { createdAt: "asc" } });
    return rows.length ? rows.map((r) => r.email) : this.envRecipients();
  }

  private async enqueue(event: NotificationEvent, out: Outgoing[], links: Links) {
    if (out.length === 0) return;
    const created = await this.prisma.$transaction(
      out.map((o) =>
        this.prisma.notification.create({
          data: {
            event,
            channel: o.channel,
            audience: o.audience,
            recipient: o.recipient,
            subject: o.email?.subject ?? null,
            body: o.email?.text ?? o.whatsapp!.text,
            html: o.email?.html ?? null,
            templateName: o.whatsapp?.templateName ?? null,
            templateParams: o.whatsapp?.params ?? [],
            ...links,
          } satisfies Prisma.NotificationUncheckedCreateInput,
          select: { id: true },
        }),
      ),
    );
    for (const { id } of created) {
      const job = this.deliver(id).catch((error: Error) => this.logger.error(`Notification ${id} failed: ${error.message}`));
      this.inFlight.add(job);
      void job.finally(() => this.inFlight.delete(job));
    }
  }

  private async deliver(id: string) {
    const n = await this.prisma.notification.update({ where: { id }, data: { attempts: { increment: 1 } } });
    const result =
      n.channel === "EMAIL"
        ? await this.emailSender.send({ to: n.recipient, subject: n.subject ?? "", text: n.body, html: n.html ?? n.body })
        : await this.whatsappSender.send(n.recipient, n.templateName ?? "", n.templateParams);
    const provider = n.channel === "EMAIL" ? (this.emailSender.status().provider ?? "log") : this.whatsappSender.status().live ? "whatsapp-cloud" : "log";
    return this.prisma.notification.update({
      where: { id },
      data: result.delivered
        ? { status: "SENT", provider, providerMessageId: result.providerMessageId, sentAt: new Date(), error: null }
        : result.logged
          ? { status: "LOGGED", provider: "log", error: null }
          : { status: "FAILED", provider, error: result.error },
      select: { id: true, status: true, error: true, attempts: true, sentAt: true },
    });
  }
}
