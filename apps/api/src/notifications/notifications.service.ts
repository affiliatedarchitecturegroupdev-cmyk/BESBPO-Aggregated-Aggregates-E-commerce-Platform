import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { NotificationAudience, NotificationChannel, NotificationEvent, NotificationStatus, PaymentMethodKey, Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import {
  customerCompanyEmail,
  customerBookingEmail,
  customerEnquiryEmail,
  customerOrderEmail,
  customerOrderWhatsApp,
  customerQuoteEmail,
  customerQuoteWhatsApp,
  quotationEmail,
  type QuotationEmailData,
  customerScheduleEmail,
  EVENT_CHANNELS,
  EVENT_LABEL,
  staffCompanyEmail,
  partnerBookingEmail,
  PARTNER_EVENTS,
  staffBookingEmail,
  staffEnquiryEmail,
  staffOrderEmail,
  staffQuoteEmail,
  staffScheduleEmail,
  supplierOrderEmail,
  whatsappNumber,
  type CompanyData,
  type EmailMessage,
  type BookingData,
  type EnquiryData,
  type OrderData,
  type QuoteData,
  type ScheduleData,
  type WhatsAppMessage,
} from "./notification-templates";
import type { SystemEmail } from "./account-emails";
import { EmailSender, WhatsAppTemplateSender, type EmailAttachment, type SendResult } from "./providers";
import { orderConfirmationPdf, ORDER_INCLUDE, taxInvoicePdf, type OrderPdf } from "../documents/order-doc-data";
import { quotationPdf } from "../documents/quotation";
import { DELIVERY_RANK, parseResendEvent, verifyResendSignature, type DeliveryStatus } from "./resend-webhook";

/** Emails a person asks for themselves: always sent, and logged with their one-time link removed, so they can't be resent. */
/** Customer order emails that carry a PDF copy of an order document. */
const ATTACHED_DOCUMENT: Partial<Record<NotificationEvent, "confirmation" | "invoice">> = {
  ORDER_CONFIRMED: "confirmation",
  PAYMENT_RECEIVED: "confirmation",
  INVOICE_ISSUED: "invoice",
};

export const SYSTEM_EVENTS: NotificationEvent[] = ["PASSWORD_RESET", "EMAIL_VERIFICATION", "NEWSLETTER_CONFIRMATION"];

type Setting = { customerEmail: boolean; customerWhatsApp: boolean; staffEmail: boolean };
type Outgoing = {
  audience: NotificationAudience;
  channel: NotificationChannel;
  recipient: string;
  email?: EmailMessage;
  whatsapp?: WhatsAppMessage;
};
type Links = { orderId?: string; quoteId?: string; companyId?: string; enquiryId?: string; bookingId?: string; bendingScheduleId?: string };

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
  DESIGN: "Design brief",
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

  /**
   * `extra.paymentId` picks the payment a receipt is for (else the latest paid
   * one); `extra.payLink` is the link for PAYMENT_LINK_SENT. Order emails go to
   * the account holder, or to the contact email of an order made from a
   * guest's quote.
   */
  async order(event: NotificationEvent, orderId: string, extra: { paymentId?: string; payLink?: OrderData["payLink"]; dropId?: string; proofId?: string } = {}) {
    await this.safely(event, async () => {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          lineItems: { include: { product: { select: { name: true } } } },
          shipment: true,
          invoice: { select: { invoiceNumber: true, amountDue: true } },
          user: { select: { email: true, name: true } },
          company: { select: { name: true, paymentTermsDays: true } },
          drops: { where: { status: { not: "CANCELLED" } }, orderBy: { sequence: "asc" }, select: { id: true, sequence: true, scheduledFor: true, carrier: true, trackingRef: true, lines: true } },
          fulfilledBySupplier: { select: { id: true, name: true, users: { select: { email: true } } } },
        },
      });
      if (!order) return;
      const methodName = async (key: PaymentMethodKey | null) =>
        key ? ((await this.prisma.paymentMethodConfig.findUnique({ where: { methodKey: key }, select: { displayName: true } }))?.displayName ?? key) : null;
      const method = await methodName(order.paymentMethod);
      const paid = await this.prisma.payment.findFirst({
        where: { orderId: order.id, status: "PAID", ...(extra.paymentId ? { id: extra.paymentId } : {}) },
        orderBy: { paidAt: "desc" },
      });
      const recipientEmail = order.user?.email ?? order.contactEmail ?? null;
      const data: OrderData = {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        ddpFee: order.ddpFee,
        total: order.total,
        deliveryAddress: order.deliveryAddress,
        deliveryProvince: order.deliveryProvince,
        deliveryDistanceKm: order.deliveryDistanceKm,
        customerName: order.user?.name ?? null,
        companyName: order.company?.name ?? null,
        lines: order.lineItems.map((l) => ({ name: l.product.name, quantity: l.quantity, unitOfSale: l.unitOfSale, lineTotal: l.lineTotal })),
        shipment: order.shipment,
        payment: { paidAt: order.paidAt, method, reference: order.paymentReference },
        amountPaid: order.amountPaid,
        paymentPlan: order.paymentPlan,
        lastPayment: paid
          ? { amount: paid.amount, kind: paid.kind, paidAt: paid.paidAt, method: await methodName(paid.methodKey), reference: paid.providerReference ?? (paid.gateway === "MANUAL_EFT" ? null : paid.id) }
          : null,
        payLink: extra.payLink ?? null,
        invoice: order.invoice,
        account: order.paymentPlan === "ACCOUNT" && order.accountDueAt ? { dueAt: order.accountDueAt, termsDays: order.company?.paymentTermsDays ?? null } : null,
        drop: await this.dropData(order, extra.dropId),
        proof: extra.proofId ? await this.prisma.proofOfDelivery.findUnique({ where: { id: extra.proofId }, select: { receivedBy: true, capturedAt: true, exceptions: true, dropId: true } }) : null,
        express:
          order.expressFee !== null
            ? { fee: order.expressFee, acceptedAt: order.expressAcceptedAt, dueAt: order.expressDueAt, declinedAt: order.expressDeclinedAt, note: order.expressNote }
            : null,
      };
      const setting = await this.setting(event);
      const out: Outgoing[] = [];
      const customerEmail = setting.customerEmail && recipientEmail ? customerOrderEmail(event, data) : null;
      if (customerEmail) out.push({ audience: "CUSTOMER", channel: "EMAIL", recipient: recipientEmail!, email: customerEmail });
      const phone = order.whatsappUpdates ? whatsappNumber(order.contactPhone) : null;
      const message = setting.customerWhatsApp && phone ? customerOrderWhatsApp(event, data) : null;
      if (message) out.push({ audience: "CUSTOMER", channel: "WHATSAPP", recipient: phone!, whatsapp: message });
      const staff = setting.staffEmail ? staffOrderEmail(event, data) : null;
      if (staff) out.push(...(await this.staffRecipients()).map((recipient) => ({ audience: "STAFF" as const, channel: "EMAIL" as const, recipient, email: staff })));
      // The supplier portal (docs/supplier-portal.md): the order to load goes to the supplier's own portal logins.
      if (event === "SUPPLIER_ORDER" && order.fulfilledBySupplier) {
        const message = supplierOrderEmail(data, order.fulfilledBySupplier.name);
        const recipients = [...new Set(order.fulfilledBySupplier.users.map((u) => u.email.toLowerCase()).filter((e) => EMAIL_PATTERN.test(e)))];
        out.push(...recipients.map((recipient) => ({ audience: "SUPPLIER" as const, channel: "EMAIL" as const, recipient, email: message })));
      }
      await this.enqueue(event, out, { orderId: order.id, companyId: order.companyId ?? undefined });
    });
  }

  private async dropData(
    order: { lineItems: { id: string; quantity: number; unitOfSale: OrderData["lines"][number]["unitOfSale"]; product: { name: string } }[]; drops: { id: string; sequence: number; scheduledFor: Date; carrier: string | null; trackingRef: string | null; lines: Prisma.JsonValue }[] },
    dropId?: string,
  ): Promise<OrderData["drop"]> {
    const drop = dropId ? order.drops.find((d) => d.id === dropId) : undefined;
    if (!drop) return null;
    const items = new Map(order.lineItems.map((l) => [l.id, l]));
    return {
      sequence: drop.sequence,
      of: order.drops.length,
      scheduledFor: drop.scheduledFor,
      carrier: drop.carrier,
      trackingRef: drop.trackingRef,
      lines: (drop.lines as { lineItemId: string; quantity: number }[]).map((l) => ({ name: items.get(l.lineItemId)?.product.name ?? "—", quantity: l.quantity, unitOfSale: items.get(l.lineItemId)?.unitOfSale ?? null, lineTotal: null })),
      next: order.drops.find((d) => d.sequence === drop.sequence + 1)?.scheduledFor ?? null,
    };
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

  /**
   * A sales quotation (docs/sales-quotes.md), emailed to the client with the
   * quotation PDF attached (made at send time, like order documents).
   */
  async quotation(quoteId: string, to: string, data: QuotationEmailData) {
    await this.safely("QUOTATION_SENT", async () => {
      const setting = await this.setting("QUOTATION_SENT");
      if (!setting.customerEmail) return;
      await this.enqueue("QUOTATION_SENT", [{ audience: "CUSTOMER", channel: "EMAIL", recipient: to, email: quotationEmail(data) }], { quoteId });
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
        credit: {
          status: company.creditStatus,
          limit: company.creditLimit,
          termsDays: company.paymentTermsDays,
          notes: company.creditNotes,
          requested: (company.creditApplication as { requestedLimit?: number; requestedTermsDays?: number } | null) ?? null,
        },
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
        design: e.kind === "DESIGN",
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

  async bendingSchedule(event: NotificationEvent, scheduleId: string) {
    await this.safely(event, async () => {
      const s = await this.prisma.bendingSchedule.findUnique({ where: { id: scheduleId }, include: { lines: { select: { barType: true, diameterMm: true, massKg: true } } } });
      if (!s) return;
      const sizes = new Map<string, number>();
      for (const l of s.lines) sizes.set(`${l.barType}${l.diameterMm}`, (sizes.get(`${l.barType}${l.diameterMm}`) ?? 0) + Number(l.massKg));
      const date = (d: Date | null) => (d ? `${d.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()]} ${d.getUTCFullYear()}` : null);
      const data: ScheduleData = {
        id: s.id,
        reference: s.reference,
        contactName: s.contactName,
        contactEmail: s.contactEmail,
        contactPhone: s.contactPhone,
        companyName: s.companyName,
        projectName: s.projectName,
        province: s.province,
        siteAddress: s.siteAddress,
        requiredBy: date(s.requiredBy),
        message: s.message,
        lineCount: s.lineCount,
        totalMassKg: Number(s.totalMassKg),
        bySize: [...sizes.entries()]
          .sort((a, b) => Number(b[0].slice(1)) - Number(a[0].slice(1)))
          .map(([size, mass]) => [size, `${mass.toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`]),
        fileName: s.fileName,
        quotedAmount: s.quotedAmount,
        quoteValidUntil: date(s.quoteValidUntil),
        quoteNotes: s.quoteNotes,
        hasAccount: s.userId !== null,
      };
      const setting = await this.setting(event);
      const out: Outgoing[] = [];
      const customer = setting.customerEmail ? customerScheduleEmail(event, data) : null;
      if (customer && EMAIL_PATTERN.test(s.contactEmail)) out.push({ audience: "CUSTOMER", channel: "EMAIL", recipient: s.contactEmail, email: customer });
      const staff = setting.staffEmail ? staffScheduleEmail(event, data) : null;
      if (staff) out.push(...(await this.staffRecipients()).map((recipient) => ({ audience: "STAFF" as const, channel: "EMAIL" as const, recipient, email: staff })));
      await this.enqueue(event, out, { bendingScheduleId: s.id });
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
        deliveryStatus: true,
        deliveryUpdatedAt: true,
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

  /** A staff-only alert that isn't about one record (a payment gateway failing). Respects the admin switch. */
  async staffAlert(event: NotificationEvent, message: EmailMessage) {
    await this.safely(event, async () => {
      if (!(await this.setting(event)).staffEmail) return;
      await this.enqueue(
        event,
        (await this.staffRecipients()).map((recipient) => ({ audience: "STAFF" as const, channel: "EMAIL" as const, recipient, email: message })),
        {},
      );
    });
  }

  /** Staff: try a failed (or merely logged) message again — e.g. once a provider is configured. */
  async resend(id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException("Notification not found.");
    if (SYSTEM_EVENTS.includes(notification.event)) {
      throw new BadRequestException("This message held a one-time link, which isn't kept — the person can ask for a new one.");
    }
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
    const [recipients, failed, logged, suppressed, bounced] = await Promise.all([
      this.staffRecipients(),
      this.prisma.notification.count({ where: { status: "FAILED" } }),
      this.prisma.notification.count({ where: { status: "LOGGED" } }),
      this.prisma.emailSuppression.count(),
      this.prisma.notification.count({ where: { deliveryStatus: { in: ["BOUNCED", "COMPLAINED"] } } }),
    ]);
    return {
      email: this.emailSender.status(),
      whatsapp: this.whatsappSender.status(),
      // Delivery reports from Resend (docs/email.md): bounces and spam complaints.
      webhook: { configured: Boolean(process.env.RESEND_WEBHOOK_SECRET), path: "/api/v1/email/webhooks/resend" },
      staffRecipientCount: recipients.length,
      failed,
      logged,
      suppressed,
      bounced,
    };
  }

  // -------------------------------------------------------------------------
  // System emails (password reset, email verification, newsletter confirmation)
  // -------------------------------------------------------------------------

  /**
   * Sends an email the person just asked for. The log keeps the redacted copy
   * (no one-time link); the real message goes straight to the provider and is
   * never stored. Suppressions don't apply: the person is asking right now.
   */
  async system(event: NotificationEvent, to: string, mail: SystemEmail, links: { companyId?: string } = {}) {
    const row = await this.prisma.notification.create({
      data: { event, channel: "EMAIL", audience: "CUSTOMER", recipient: to, subject: mail.redacted.subject, body: mail.redacted.text, html: null, attempts: 1, ...links },
      select: { id: true },
    });
    const result = await this.emailSender.send({ to, ...mail.message }).catch((error: Error): SendResult => ({ delivered: false, logged: false, error: error.message }));
    const provider = this.emailSender.status().provider ?? "log";
    await this.prisma.notification.update({
      where: { id: row.id },
      data: result.delivered
        ? { status: "SENT", provider, providerMessageId: result.providerMessageId, sentAt: new Date() }
        : result.logged
          ? { status: "LOGGED", provider: "log" }
          : { status: "FAILED", provider, error: result.error },
    });
    // Locally (no provider) the link is printed so a developer can follow it; never in a deployment.
    if (result.delivered === false && "logged" in result && result.logged && !process.env.RENDER) {
      this.logger.log(`[dev] ${event} for …${to.slice(-12)}: ${mail.message.text.match(/https?:\/\/\S+/)?.[0] ?? ""}`);
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Delivery reports and suppressions
  // -------------------------------------------------------------------------

  /**
   * A Resend webhook. Records what happened to the message, and suppresses
   * an address that hard-bounced or marked us as spam. Returns the addresses
   * that complained, so the newsletter can unsubscribe them.
   */
  async resendWebhook(rawBody: Buffer | undefined, headers: { id?: string; timestamp?: string; signature?: string }) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return { accepted: false as const, reason: "not-configured" };
    if (!verifyResendSignature(rawBody, headers, secret)) return { accepted: false as const, reason: "bad-signature" };
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody!.toString("utf8"));
    } catch {
      return { accepted: false as const, reason: "bad-json" };
    }
    const event = parseResendEvent(payload);
    if (!event) return { accepted: true as const, complained: [] as string[] };
    const rows = await this.prisma.notification.findMany({ where: { providerMessageId: event.messageId }, select: { id: true, deliveryStatus: true } });
    const now = new Date();
    for (const row of rows) {
      const current = row.deliveryStatus as DeliveryStatus | null;
      if (current && DELIVERY_RANK[current] > DELIVERY_RANK[event.status]) continue;
      await this.prisma.notification.update({ where: { id: row.id }, data: { deliveryStatus: event.status, deliveryUpdatedAt: now } });
    }
    if (event.suppress) {
      for (const email of event.recipients) {
        await this.prisma.emailSuppression.upsert({
          where: { email },
          create: { email, reason: event.status, detail: event.detail },
          update: { reason: event.status, detail: event.detail },
        });
      }
    }
    return { accepted: true as const, complained: event.status === "COMPLAINED" ? event.recipients : [] };
  }

  suppressions() {
    return this.prisma.emailSuppression.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
  }

  async addSuppression(email: string, detail?: string) {
    const normalised = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalised)) throw new BadRequestException("Enter a valid email address.");
    return this.prisma.emailSuppression.upsert({
      where: { email: normalised },
      create: { email: normalised, reason: "MANUAL", detail: detail?.trim() || null },
      update: {},
    });
  }

  /** Admin: email this address again (e.g. the mailbox is fixed). */
  async removeSuppression(email: string) {
    await this.prisma.emailSuppression.deleteMany({ where: { email: email.trim().toLowerCase() } });
    return { removed: true };
  }

  async isSuppressed(email: string) {
    return Boolean(await this.prisma.emailSuppression.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } }));
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

  /**
   * The PDF a customer's order email carries, made fresh when it's sent (and
   * on a resend), so nothing is stored: the order confirmation with a payment
   * receipt, the tax invoice with INVOICE_ISSUED. If the PDF can't be made,
   * the email still goes — the documents are on the order page too.
   */
  private async attachments(n: { event: NotificationEvent; audience: NotificationAudience; orderId: string | null; quoteId: string | null }): Promise<EmailAttachment[]> {
    if (n.event === "QUOTATION_SENT" && n.quoteId) {
      const file = await quotationPdf(this.prisma, n.quoteId).catch((error: Error) => {
        this.logger.warn(`Couldn't attach the quotation PDF: ${error.message}`);
        return null;
      });
      return file ? [{ fileName: file.fileName, content: file.pdf, contentType: "application/pdf" }] : [];
    }
    const kind = n.audience === "CUSTOMER" && n.orderId ? ATTACHED_DOCUMENT[n.event] : undefined;
    if (!kind) return [];
    try {
      const order = await this.prisma.order.findUnique({ where: { id: n.orderId! }, include: ORDER_INCLUDE });
      if (!order) return [];
      const file: OrderPdf | null = kind === "invoice" ? await taxInvoicePdf(order) : await orderConfirmationPdf(order);
      return file ? [{ fileName: file.fileName, content: file.pdf, contentType: "application/pdf" }] : [];
    } catch (error) {
      this.logger.warn(`Couldn't attach the ${kind} PDF to ${n.event}: ${(error as Error).message}`);
      return [];
    }
  }

  private async deliver(id: string) {
    const n = await this.prisma.notification.update({ where: { id }, data: { attempts: { increment: 1 } } });
    // A hard bounce or spam complaint stops further email to that address (Admin → Notifications can lift it).
    if (n.channel === "EMAIL") {
      const suppressed = await this.prisma.emailSuppression.findUnique({ where: { email: n.recipient.toLowerCase() }, select: { reason: true } });
      if (suppressed) {
        return this.prisma.notification.update({
          where: { id },
          data: { status: "FAILED", provider: "suppressed", error: `Not sent: this address is suppressed (${suppressed.reason.toLowerCase()}). Lift it on Admin → Notifications to email it again.` },
          select: { id: true, status: true, error: true, attempts: true, sentAt: true },
        });
      }
    }
    const result =
      n.channel === "EMAIL"
        ? await this.emailSender.send({ to: n.recipient, subject: n.subject ?? "", text: n.body, html: n.html ?? n.body, attachments: await this.attachments(n) })
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
