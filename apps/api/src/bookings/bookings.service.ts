import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { BookingStatus, MessageSender, Prisma, type Booking } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { bankingDetailLines } from "../common/format";
import { PrismaService } from "../common/prisma.service";
import { redactContactDetails } from "../common/redact";
import { NotificationsService } from "../notifications/notifications.service";
import { PricingService } from "../pricing/pricing.service";
import type { ConfirmPaymentDto, CreateBookingDto, JobCardDto, ResolveDisputeDto } from "./bookings.dto";
import {
  chatOpen,
  customerTotal,
  generateOtp,
  haversineKm,
  MAX_OTP_FAILURES,
  mayRevealPartner,
  offerExpiry,
  overlaps,
  payoutReleaseTime,
  rankPartners,
  repeatPairStopped,
  verifyOtp,
  type PartnerCandidate,
} from "./dispatch";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function reference(): string {
  const now = new Date();
  const date = `${String(now.getUTCFullYear()).slice(2)}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
  return `BK-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

/** Statuses a booking can still be cancelled from (before the work is signed off). */
const CANCELLABLE: BookingStatus[] = ["QUOTED", "AWAITING_PAYMENT", "DISPATCHING", "ACCEPTED", "UNFULFILLED", "DISPUTED"];

/**
 * Plant-hire and site-service bookings on the Agent model
 * (PLANT_HIRE_CATALOGUE.md):
 *
 *   QUOTED → AWAITING_PAYMENT → DISPATCHING → ACCEPTED → IN_PROGRESS → COMPLETED → CLOSED
 *
 * Staff price a booking only from a partner's written quote plus the fixed
 * commission. The customer accepts and pays by EFT; staff confirm the
 * payment, which starts dispatch: partners are offered the job one at a time
 * with a 30-minute window. The customer's arrival code starts the job, their
 * sign-off starts the 48-hour dispute window, and staff pay the partner by
 * EFT once the payout is due. Partners and customers never see each other's
 * contact details; chat is redacted and every redaction is flagged for review.
 */
@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly notifications: NotificationsService,
  ) {}

  // -------------------------------------------------------------------------
  // Staff
  // -------------------------------------------------------------------------

  async create(dto: CreateBookingDto, staff: AuthUser) {
    const catalogue = await this.pricing.hireCatalogue();
    const item = catalogue.items.get(dto.sku);
    if (!item) throw new BadRequestException(`${dto.sku} isn't in the plant-hire or site-services catalogue.`);
    const start = day(dto.startDate);
    const end = day(dto.endDate);
    if (end < start) throw new BadRequestException("The end date can't be before the start date.");
    const customer = await this.prisma.user.findUnique({ where: { email: dto.customerEmail }, select: { id: true, role: true } });
    if (!customer) throw new NotFoundException("No account uses that email. Ask the customer to create one (it's free), then try again.");
    if (customer.role === "PARTNER") throw new BadRequestException("That email belongs to a partner login, not a customer.");
    if (dto.preferredPartnerId) {
      const partner = await this.prisma.hirePartner.findUnique({ where: { id: dto.preferredPartnerId }, select: { id: true } });
      if (!partner) throw new BadRequestException("The quoting partner wasn't found.");
    }
    const booking = await this.prisma.booking.create({
      data: {
        reference: reference(),
        userId: customer.id,
        enquiryId: dto.enquiryId ?? null,
        sku: item.sku,
        itemName: item.name,
        basis: dto.basis,
        quantity: dto.quantity,
        startDate: start,
        endDate: end,
        province: dto.province,
        siteAddress: dto.siteAddress,
        siteNotes: dto.siteNotes ?? null,
        partnerAmount: dto.partnerAmount,
        commissionPercent: catalogue.commissionPercent,
        customerTotal: customerTotal(dto.partnerAmount, catalogue.commissionPercent),
        quoteSource: dto.quoteSource,
        quoteValidUntil: dto.quoteValidUntil ? day(dto.quoteValidUntil) : null,
        preferredPartnerId: dto.preferredPartnerId ?? null,
        createdById: staff.id,
      },
    });
    if (dto.enquiryId) {
      await this.prisma.enquiry.updateMany({ where: { id: dto.enquiryId, status: { in: ["NEW", "IN_PROGRESS"] } }, data: { status: "QUOTED" } });
    }
    await this.notifications.booking("BOOKING_QUOTED", booking.id);
    return booking;
  }

  list(status?: BookingStatus) {
    return this.prisma.booking.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        user: { select: { email: true, name: true } },
        assignedPartner: { select: { id: true, name: true } },
        payout: { select: { status: true, amount: true, releaseAfter: true } },
        disputes: { where: { status: "OPEN" }, select: { id: true } },
      },
    });
  }

  async staffView(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, name: true } },
        assignedPartner: { select: { id: true, name: true, contactEmail: true, contactPhone: true } },
        preferredPartner: { select: { id: true, name: true } },
        offers: { orderBy: { offeredAt: "asc" }, include: { partner: { select: { name: true } } } },
        jobCards: { orderBy: { workDate: "asc" } },
        messages: { orderBy: { createdAt: "asc" } },
        disputes: { orderBy: { createdAt: "desc" } },
        payout: true,
      },
    });
    if (!booking) throw new NotFoundException("Booking not found.");
    const { arrivalOtpHash, ...rest } = booking;
    return { ...rest, hasArrivalCode: arrivalOtpHash !== null };
  }

  /** Staff confirm the customer's EFT has cleared: dispatch starts. */
  async confirmPayment(id: string, dto: ConfirmPaymentDto) {
    const moved = await this.prisma.booking.updateMany({
      where: { id, status: "AWAITING_PAYMENT" },
      data: { status: "DISPATCHING", paidAt: new Date(), paymentReference: dto.paymentReference },
    });
    if (moved.count === 0) throw await this.wrongState(id, "awaiting payment");
    await this.notifications.booking("BOOKING_PAYMENT_CONFIRMED", id);
    await this.dispatch(id);
    return this.staffView(id);
  }

  /** After adding a partner or fleet to an UNFULFILLED booking: try again with partners not yet offered. */
  async redispatch(id: string) {
    const moved = await this.prisma.booking.updateMany({ where: { id, status: "UNFULFILLED" }, data: { status: "DISPATCHING" } });
    if (moved.count === 0) throw await this.wrongState(id, "unfulfilled");
    await this.dispatch(id);
    return this.staffView(id);
  }

  async cancel(id: string, reason: string) {
    const booking = await this.get(id);
    if (!CANCELLABLE.includes(booking.status)) throw new BadRequestException("This booking can no longer be cancelled.");
    await this.prisma.$transaction([
      this.prisma.dispatchOffer.updateMany({ where: { bookingId: id, status: "PENDING" }, data: { status: "WITHDRAWN", respondedAt: new Date() } }),
      this.prisma.partnerAvailabilityBlock.deleteMany({ where: { bookingId: id } }),
      this.prisma.partnerPayout.updateMany({ where: { bookingId: id, status: { not: "PAID" } }, data: { status: "CANCELLED" } }),
      this.prisma.booking.update({ where: { id }, data: { status: "CANCELLED", cancelledReason: reason } }),
    ]);
    return this.staffView(id);
  }

  async resolveDispute(disputeId: string, dto: ResolveDisputeDto, staff: AuthUser) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId }, include: { booking: true } });
    if (!dispute || dispute.status !== "OPEN") throw new NotFoundException("Open dispute not found.");
    const now = new Date();
    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { status: "RESOLVED", outcome: dto.outcome, resolution: dto.resolution, resolvedById: staff.id, resolvedAt: now },
    });
    const stillOpen = await this.prisma.dispute.count({ where: { bookingId: dispute.bookingId, status: "OPEN" } });
    if (stillOpen > 0) return this.staffView(dispute.bookingId);
    if (dto.outcome === "REFUND_CUSTOMER") {
      // Refunds are paid by staff outside the platform; the partner isn't paid.
      await this.prisma.$transaction([
        this.prisma.partnerPayout.updateMany({ where: { bookingId: dispute.bookingId, status: { not: "PAID" } }, data: { status: "CANCELLED" } }),
        this.prisma.booking.update({ where: { id: dispute.bookingId }, data: { status: "CANCELLED", cancelledReason: `Dispute resolved — refund: ${dto.resolution}` } }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.partnerPayout.updateMany({ where: { bookingId: dispute.bookingId, status: { in: ["PENDING", "HELD"] } }, data: { status: "DUE", releaseAfter: now } }),
        this.prisma.booking.update({ where: { id: dispute.bookingId }, data: { status: "COMPLETED", completedAt: dispute.booking.completedAt ?? now } }),
      ]);
      await this.notifications.booking("PAYOUT_DUE", dispute.bookingId);
    }
    return this.staffView(dispute.bookingId);
  }

  listPayouts(status?: Prisma.PartnerPayoutWhereInput["status"]) {
    return this.prisma.partnerPayout.findMany({
      where: { status },
      orderBy: [{ status: "asc" }, { releaseAfter: "asc" }],
      take: 200,
      include: { booking: { select: { id: true, reference: true, itemName: true } }, partner: { select: { name: true, payoutDetailsConfirmed: true } } },
    });
  }

  /** Staff paid the partner by EFT. */
  async markPayoutPaid(payoutId: string, paidReference: string) {
    const payout = await this.prisma.partnerPayout.findUnique({ where: { id: payoutId }, include: { partner: { select: { payoutDetailsConfirmed: true } } } });
    if (!payout) throw new NotFoundException("Payout not found.");
    if (payout.status !== "DUE") throw new BadRequestException("Only a payout that's due can be marked paid.");
    if (!payout.partner.payoutDetailsConfirmed) throw new BadRequestException("Confirm the partner's bank details (bank letter on file) before paying.");
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.partnerPayout.update({ where: { id: payoutId }, data: { status: "PAID", paidAt: now, paidReference } }),
      this.prisma.booking.update({ where: { id: payout.bookingId }, data: { status: "CLOSED", closedAt: now } }),
    ]);
    return this.prisma.partnerPayout.findUnique({ where: { id: payoutId } });
  }

  listFlags(status: "OPEN" | "DISMISSED" | "ACTIONED" = "OPEN") {
    return this.prisma.circumventionFlag.findMany({ where: { status }, orderBy: { createdAt: "desc" }, take: 200 });
  }

  async reviewFlag(id: string, status: "DISMISSED" | "ACTIONED", reviewNote: string | null) {
    const flag = await this.prisma.circumventionFlag.findUnique({ where: { id } });
    if (!flag) throw new NotFoundException("Flag not found.");
    return this.prisma.circumventionFlag.update({ where: { id }, data: { status, reviewNote, reviewedAt: new Date() } });
  }

  /** Customer–partner pairs with three or more jobs in the prior 90 days and none since: one open flag per pair. */
  async scanRepeatPairs(now: Date = new Date()) {
    const since = new Date(now.getTime() - 180 * 86_400_000);
    const cutoff = new Date(now.getTime() - 90 * 86_400_000);
    const rows = await this.prisma.booking.findMany({
      where: { assignedPartnerId: { not: null }, assignedAt: { gte: since }, status: { notIn: ["CANCELLED"] } },
      select: { userId: true, assignedPartnerId: true, assignedAt: true },
    });
    const pairs = new Map<string, { userId: string; partnerId: string; last: number; prior: number }>();
    for (const r of rows) {
      const key = `${r.userId}:${r.assignedPartnerId}`;
      const pair = pairs.get(key) ?? { userId: r.userId, partnerId: r.assignedPartnerId!, last: 0, prior: 0 };
      if (r.assignedAt! >= cutoff) pair.last++;
      else pair.prior++;
      pairs.set(key, pair);
    }
    let flagged = 0;
    for (const p of pairs.values()) {
      if (!repeatPairStopped({ bookingsLast90d: p.last, bookingsPrior90d: p.prior })) continue;
      const open = await this.prisma.circumventionFlag.count({ where: { signal: "REPEAT_PAIR_STOPPED", userId: p.userId, partnerId: p.partnerId, status: "OPEN" } });
      if (open) continue;
      await this.prisma.circumventionFlag.create({
        data: { signal: "REPEAT_PAIR_STOPPED", userId: p.userId, partnerId: p.partnerId, detail: `${p.prior} jobs together in the 90 days before last, none since.` },
      });
      flagged++;
    }
    return { flagged };
  }

  // -------------------------------------------------------------------------
  // Customer
  // -------------------------------------------------------------------------

  mine(user: AuthUser) {
    return this.prisma.booking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, reference: true, itemName: true, status: true, startDate: true, endDate: true, customerTotal: true, province: true, createdAt: true },
    });
  }

  async customerView(id: string, user: AuthUser) {
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        assignedPartner: { select: { name: true } },
        jobCards: { orderBy: { workDate: "asc" }, select: { id: true, workDate: true, hoursWorked: true, startHourMeter: true, endHourMeter: true, loads: true, notes: true } },
        messages: { orderBy: { createdAt: "asc" }, select: { id: true, sender: true, body: true, wasRedacted: true, createdAt: true } },
        disputes: { orderBy: { createdAt: "desc" }, select: { id: true, raisedBy: true, reason: true, status: true, outcome: true, resolution: true, createdAt: true } },
        payout: { select: { releaseAfter: true } },
      },
    });
    if (!b || b.userId !== user.id) throw new NotFoundException("Booking not found.");
    return {
      id: b.id,
      reference: b.reference,
      itemName: b.itemName,
      sku: b.sku,
      basis: b.basis,
      quantity: b.quantity,
      startDate: b.startDate,
      endDate: b.endDate,
      province: b.province,
      siteAddress: b.siteAddress,
      siteNotes: b.siteNotes,
      customerTotal: b.customerTotal,
      quoteValidUntil: b.quoteValidUntil,
      status: b.status,
      cancelledReason: b.cancelledReason,
      customerRating: b.customerRating,
      paidAt: b.paidAt,
      completedAt: b.completedAt,
      disputeWindowEndsAt: b.payout?.releaseAfter ?? null,
      partnerName: mayRevealPartner(b.status) ? (b.assignedPartner?.name ?? null) : null,
      chatOpen: chatOpen(b.status),
      // Shown only while the customer owes the EFT, so the reference always matches.
      payment: b.status === "AWAITING_PAYMENT" ? { reference: b.reference, bankingDetails: bankingDetailLines() } : null,
      jobCards: b.jobCards,
      messages: b.messages,
      disputes: b.disputes,
    };
  }

  async acceptQuote(id: string, user: AuthUser) {
    const b = await this.owned(id, user);
    if (b.status !== "QUOTED") throw new BadRequestException("This quote is no longer open.");
    if (b.quoteValidUntil && b.quoteValidUntil.getTime() + 86_400_000 <= Date.now()) {
      throw new BadRequestException("This quote has expired — reply to our email and we'll re-confirm the price with the partner.");
    }
    await this.prisma.booking.updateMany({ where: { id, status: "QUOTED" }, data: { status: "AWAITING_PAYMENT", acceptedAt: new Date() } });
    return this.customerView(id, user);
  }

  async declineQuote(id: string, user: AuthUser) {
    const b = await this.owned(id, user);
    if (b.status !== "QUOTED") throw new BadRequestException("This quote is no longer open.");
    await this.prisma.booking.update({ where: { id }, data: { status: "DECLINED" } });
    return this.customerView(id, user);
  }

  /** A fresh 6-digit arrival code, shown once; any earlier code stops working. */
  async arrivalCode(id: string, user: AuthUser) {
    const b = await this.owned(id, user);
    if (b.status !== "ACCEPTED") throw new BadRequestException("The arrival code is available once a partner is assigned and until the job starts.");
    const { otp, hash } = generateOtp();
    await this.prisma.booking.update({ where: { id }, data: { arrivalOtpHash: hash, otpFailures: 0 } });
    return { code: otp };
  }

  async signOff(id: string, user: AuthUser, rating?: number) {
    await this.owned(id, user);
    const now = new Date();
    const moved = await this.prisma.booking.updateMany({
      where: { id, status: "IN_PROGRESS" },
      data: { status: "COMPLETED", completedAt: now, customerRating: rating ?? null },
    });
    if (moved.count === 0) throw new BadRequestException("Only a job in progress can be signed off.");
    await this.prisma.partnerPayout.updateMany({ where: { bookingId: id, status: "PENDING" }, data: { status: "HELD", releaseAfter: payoutReleaseTime(now) } });
    await this.notifications.booking("BOOKING_COMPLETED", id);
    return this.customerView(id, user);
  }

  async customerDispute(id: string, user: AuthUser, reason: string) {
    const b = await this.owned(id, user);
    await this.raiseDispute(b, "CUSTOMER", user.id, reason);
    return this.customerView(id, user);
  }

  async customerMessage(id: string, user: AuthUser, body: string) {
    const b = await this.owned(id, user);
    await this.postMessage(b, "CUSTOMER", user.id, body);
    return this.customerView(id, user);
  }

  // -------------------------------------------------------------------------
  // Partner portal
  // -------------------------------------------------------------------------

  async portal(user: AuthUser) {
    const partnerId = await this.partnerIdOf(user);
    const now = new Date();
    const [partner, offers, jobs, payouts] = await Promise.all([
      this.prisma.hirePartner.findUniqueOrThrow({
        where: { id: partnerId },
        select: {
          id: true,
          name: true,
          province: true,
          status: true,
          payoutDetailsConfirmed: true,
          fleet: { orderBy: { createdAt: "asc" }, include: { availability: { where: { endsOn: { gte: new Date(now.toISOString().slice(0, 10)) } }, orderBy: { startsOn: "asc" } } } },
        },
      }),
      this.prisma.dispatchOffer.findMany({
        where: { partnerId, status: "PENDING", expiresAt: { gt: now } },
        orderBy: { expiresAt: "asc" },
        include: { booking: { select: { reference: true, itemName: true, sku: true, basis: true, quantity: true, startDate: true, endDate: true, province: true, siteAddress: true, siteNotes: true, partnerAmount: true } } },
      }),
      this.prisma.booking.findMany({
        where: { assignedPartnerId: partnerId, status: { in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED", "DISPUTED"] } },
        orderBy: { startDate: "asc" },
        select: { id: true, reference: true, itemName: true, status: true, startDate: true, endDate: true, province: true, siteAddress: true, partnerAmount: true },
      }),
      this.prisma.partnerPayout.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { id: true, amount: true, status: true, releaseAfter: true, paidAt: true, paidReference: true, booking: { select: { reference: true, itemName: true } } },
      }),
    ]);
    return { partner, offers, jobs, payouts };
  }

  async respondToOffer(offerId: string, user: AuthUser, accept: boolean) {
    const partnerId = await this.partnerIdOf(user);
    const offer = await this.prisma.dispatchOffer.findUnique({ where: { id: offerId }, include: { booking: true } });
    if (!offer || offer.partnerId !== partnerId) throw new NotFoundException("Offer not found.");
    const now = new Date();
    if (offer.status !== "PENDING" || offer.expiresAt <= now || offer.booking.status !== "DISPATCHING") {
      throw new ConflictException("This offer has closed — it expired or went to another partner.");
    }
    if (!accept) {
      const declined = await this.prisma.dispatchOffer.updateMany({ where: { id: offerId, status: "PENDING" }, data: { status: "DECLINED", respondedAt: now } });
      if (declined.count) await this.dispatch(offer.bookingId);
      return { status: "DECLINED" as const };
    }
    const unit = await this.freeUnit(partnerId, offer.booking);
    if (!unit) throw new ConflictException("None of your active fleet for this job is free on these dates. Decline the offer, or free up a unit first.");
    // Conditional updates so a late sweep or a second click can't double-assign.
    const won = await this.prisma.$transaction(async (tx) => {
      const taken = await tx.dispatchOffer.updateMany({ where: { id: offerId, status: "PENDING", expiresAt: { gt: now } }, data: { status: "ACCEPTED", respondedAt: now } });
      if (taken.count === 0) return false;
      const assigned = await tx.booking.updateMany({ where: { id: offer.bookingId, status: "DISPATCHING" }, data: { status: "ACCEPTED", assignedPartnerId: partnerId, assignedAt: now } });
      if (assigned.count === 0) throw new ConflictException("This booking is no longer being dispatched.");
      await tx.partnerAvailabilityBlock.create({ data: { fleetUnitId: unit.id, startsOn: offer.booking.startDate, endsOn: offer.booking.endDate, reason: `Booking ${offer.booking.reference}`, bookingId: offer.bookingId } });
      await tx.partnerPayout.create({ data: { bookingId: offer.bookingId, partnerId, amount: offer.booking.partnerAmount, status: "PENDING" } });
      return true;
    });
    if (!won) throw new ConflictException("This offer has closed — it expired or went to another partner.");
    await this.notifications.booking("BOOKING_PARTNER_ASSIGNED", offer.bookingId);
    return { status: "ACCEPTED" as const, bookingId: offer.bookingId };
  }

  async partnerJob(id: string, user: AuthUser) {
    const partnerId = await this.partnerIdOf(user);
    const b = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { name: true } },
        jobCards: { orderBy: { workDate: "asc" } },
        messages: { orderBy: { createdAt: "asc" }, select: { id: true, sender: true, body: true, wasRedacted: true, createdAt: true } },
        disputes: { orderBy: { createdAt: "desc" }, select: { id: true, raisedBy: true, reason: true, status: true, outcome: true, resolution: true, createdAt: true } },
        payout: { select: { amount: true, status: true, releaseAfter: true, paidAt: true } },
      },
    });
    if (!b || b.assignedPartnerId !== partnerId) throw new NotFoundException("Job not found.");
    return {
      id: b.id,
      reference: b.reference,
      itemName: b.itemName,
      basis: b.basis,
      quantity: b.quantity,
      startDate: b.startDate,
      endDate: b.endDate,
      province: b.province,
      siteAddress: b.siteAddress,
      siteNotes: b.siteNotes,
      status: b.status,
      // First name only: the Agent model names the parties, not their contact details.
      customerFirstName: b.user.name?.trim().split(/\s+/)[0] ?? "the customer",
      partnerAmount: b.partnerAmount,
      chatOpen: chatOpen(b.status),
      codeLocked: b.otpFailures >= MAX_OTP_FAILURES,
      jobCards: b.jobCards,
      messages: b.messages,
      disputes: b.disputes,
      payout: b.payout,
    };
  }

  /** The operator enters the code the customer reads out on arrival. */
  async startJob(id: string, user: AuthUser, code: string) {
    const b = await this.assigned(id, user);
    if (b.status !== "ACCEPTED") throw new BadRequestException("This job isn't waiting to start.");
    if (!b.arrivalOtpHash) throw new BadRequestException("The customer hasn't opened their arrival code yet — ask them to open their booking.");
    if (b.otpFailures >= MAX_OTP_FAILURES) throw new ForbiddenException("Too many wrong codes. Ask the customer to open a new code in their booking.");
    if (!verifyOtp(code, b.arrivalOtpHash)) {
      await this.prisma.booking.update({ where: { id }, data: { otpFailures: { increment: 1 } } });
      throw new BadRequestException("That code doesn't match. Ask the customer to check the code in their booking.");
    }
    await this.prisma.booking.updateMany({ where: { id, status: "ACCEPTED" }, data: { status: "IN_PROGRESS", startedAt: new Date(), arrivalOtpHash: null } });
    return this.partnerJob(id, user);
  }

  async addJobCard(id: string, user: AuthUser, dto: JobCardDto) {
    const b = await this.assigned(id, user);
    if (b.status !== "IN_PROGRESS") throw new BadRequestException("Job cards are added while the job is in progress.");
    const workDate = day(dto.workDate);
    if (workDate < b.startDate || workDate > b.endDate) throw new BadRequestException("The work date must fall within the booking's dates.");
    if (dto.startHourMeter !== undefined && dto.endHourMeter !== undefined && dto.endHourMeter < dto.startHourMeter) {
      throw new BadRequestException("The closing hour-meter reading can't be lower than the opening one.");
    }
    const notes = dto.notes ? redactContactDetails(dto.notes) : null;
    await this.prisma.jobCard.create({
      data: {
        bookingId: id,
        workDate,
        hoursWorked: dto.hoursWorked ?? null,
        startHourMeter: dto.startHourMeter ?? null,
        endHourMeter: dto.endHourMeter ?? null,
        loads: dto.loads ?? null,
        notes: notes?.text ?? null,
        createdById: user.id,
      },
    });
    if (notes?.hits.length) await this.flagRedaction(b, "PARTNER", notes.hits, "job card");
    return this.partnerJob(id, user);
  }

  async partnerMessage(id: string, user: AuthUser, body: string) {
    const b = await this.assigned(id, user);
    await this.postMessage(b, "PARTNER", user.id, body);
    return this.partnerJob(id, user);
  }

  async partnerDispute(id: string, user: AuthUser, reason: string) {
    const b = await this.assigned(id, user);
    await this.raiseDispute(b, "PARTNER", user.id, reason);
    return this.partnerJob(id, user);
  }

  async staffMessage(id: string, user: AuthUser, body: string) {
    const b = await this.get(id);
    // Staff write freely (no redaction, no flag), e.g. to give a gate code or a site contact on request.
    await this.prisma.bookingMessage.create({ data: { bookingId: b.id, sender: "STAFF", authorId: user.id, body, wasRedacted: false } });
    return this.staffView(id);
  }

  async blockAvailability(fleetUnitId: string, user: AuthUser, startsOn: string, endsOn: string, reason: string | null) {
    const partnerId = await this.partnerIdOf(user);
    const unit = await this.prisma.partnerFleetUnit.findUnique({ where: { id: fleetUnitId } });
    if (!unit || unit.partnerId !== partnerId) throw new NotFoundException("Fleet unit not found.");
    if (day(endsOn) < day(startsOn)) throw new BadRequestException("The last day can't be before the first.");
    return this.prisma.partnerAvailabilityBlock.create({ data: { fleetUnitId, startsOn: day(startsOn), endsOn: day(endsOn), reason } });
  }

  /** Partners remove their own blocks; blocks created by an accepted booking stay. */
  async unblockAvailability(blockId: string, user: AuthUser) {
    const partnerId = await this.partnerIdOf(user);
    const block = await this.prisma.partnerAvailabilityBlock.findUnique({ where: { id: blockId }, include: { fleetUnit: { select: { partnerId: true } } } });
    if (!block || block.fleetUnit.partnerId !== partnerId) throw new NotFoundException("Block not found.");
    if (block.bookingId) throw new BadRequestException("That block belongs to a booking.");
    await this.prisma.partnerAvailabilityBlock.delete({ where: { id: blockId } });
  }

  // -------------------------------------------------------------------------
  // Dispatch and the minute sweep
  // -------------------------------------------------------------------------

  /** Offer the booking to the best partner not yet offered it; none left → UNFULFILLED. */
  async dispatch(bookingId: string) {
    const booking = await this.get(bookingId);
    if (booking.status !== "DISPATCHING") return { status: booking.status };
    const pending = await this.prisma.dispatchOffer.count({ where: { bookingId, status: "PENDING" } });
    if (pending > 0) return { status: booking.status };
    const ranked = await this.rankedPartners(booking);
    if (ranked.length === 0) {
      const moved = await this.prisma.booking.updateMany({ where: { id: bookingId, status: "DISPATCHING" }, data: { status: "UNFULFILLED" } });
      if (moved.count) await this.notifications.booking("BOOKING_UNFULFILLED", bookingId);
      return { status: "UNFULFILLED" as const };
    }
    const rank = await this.prisma.dispatchOffer.count({ where: { bookingId } });
    const offer = await this.prisma.dispatchOffer.create({ data: { bookingId, partnerId: ranked[0].partnerId, rank, expiresAt: offerExpiry() } });
    await this.notifications.booking("BOOKING_OFFERED", bookingId, { partnerId: offer.partnerId });
    return { status: "DISPATCHING" as const, offeredTo: offer.partnerId, expiresAt: offer.expiresAt };
  }

  /** Expire offers past their window (moving the cascade on) and release payouts whose dispute window has closed. */
  async sweep(now: Date = new Date()) {
    let expired = 0;
    const stale = await this.prisma.dispatchOffer.findMany({ where: { status: "PENDING", expiresAt: { lte: now } }, select: { id: true, bookingId: true } });
    for (const offer of stale) {
      const moved = await this.prisma.dispatchOffer.updateMany({ where: { id: offer.id, status: "PENDING" }, data: { status: "EXPIRED", respondedAt: now } });
      if (moved.count === 0) continue;
      expired++;
      await this.dispatch(offer.bookingId);
    }
    let released = 0;
    const due = await this.prisma.partnerPayout.findMany({ where: { status: "HELD", releaseAfter: { lte: now } }, select: { id: true, bookingId: true } });
    for (const payout of due) {
      const open = await this.prisma.dispute.count({ where: { bookingId: payout.bookingId, status: "OPEN" } });
      if (open > 0) continue;
      const moved = await this.prisma.partnerPayout.updateMany({ where: { id: payout.id, status: "HELD" }, data: { status: "DUE" } });
      if (moved.count === 0) continue;
      released++;
      await this.notifications.booking("PAYOUT_DUE", payout.bookingId);
    }
    if (expired || released) this.logger.log(`Sweep: ${expired} offer(s) expired, ${released} payout(s) due.`);
    return { expired, released };
  }

  private async rankedPartners(booking: Booking) {
    const offered = await this.prisma.dispatchOffer.findMany({ where: { bookingId: booking.id }, select: { partnerId: true } });
    const exclude = new Set(offered.map((o) => o.partnerId));
    const units = await this.prisma.partnerFleetUnit.findMany({
      where: { sku: booking.sku, province: booking.province, isActive: true, partner: { status: "ACTIVE" } },
      include: { partner: true, availability: true },
    });
    const partners = new Map<string, (typeof units)[number]["partner"]>();
    for (const u of units) {
      if (exclude.has(u.partnerId)) continue;
      const busy = u.availability.some((b) => overlaps(b.startsOn, b.endsOn, booking.startDate, booking.endDate));
      if (!busy) partners.set(u.partnerId, u.partner);
    }
    if (partners.size === 0) return [];
    const ids = [...partners.keys()];
    const [offerStats, jobs] = await Promise.all([
      this.prisma.dispatchOffer.groupBy({ by: ["partnerId", "status"], where: { partnerId: { in: ids }, status: { in: ["ACCEPTED", "DECLINED", "EXPIRED"] } }, _count: { _all: true } }),
      this.prisma.booking.findMany({ where: { assignedPartnerId: { in: ids } }, select: { assignedPartnerId: true, customerRating: true, disputes: { select: { id: true } } } }),
    ]);
    const candidates: PartnerCandidate[] = ids.map((id) => {
      const p = partners.get(id)!;
      const stats = offerStats.filter((s) => s.partnerId === id);
      const mine = jobs.filter((j) => j.assignedPartnerId === id);
      return {
        partnerId: id,
        isGroupEntity: p.isGroupEntity,
        distanceKm:
          p.latitude !== null && p.longitude !== null && booking.siteLatitude !== null && booking.siteLongitude !== null
            ? haversineKm(booking.siteLatitude, booking.siteLongitude, p.latitude, p.longitude)
            : null,
        history: {
          offersAnswered: stats.reduce((n, s) => n + s._count._all, 0),
          offersAccepted: stats.find((s) => s.status === "ACCEPTED")?._count._all ?? 0,
          jobsAssigned: mine.length,
          jobsDisputed: mine.filter((j) => j.disputes.length > 0).length,
          ratings: mine.map((j) => j.customerRating).filter((r): r is number => r !== null),
        },
      };
    });
    return rankPartners(candidates, booking.preferredPartnerId);
  }

  /** The partner's first active unit for this job that's free on the booking's dates. */
  private async freeUnit(partnerId: string, booking: Booking) {
    const units = await this.prisma.partnerFleetUnit.findMany({
      where: { partnerId, sku: booking.sku, province: booking.province, isActive: true },
      include: { availability: true },
      orderBy: { createdAt: "asc" },
    });
    return units.find((u) => !u.availability.some((b) => overlaps(b.startsOn, b.endsOn, booking.startDate, booking.endDate))) ?? null;
  }

  // -------------------------------------------------------------------------
  // Shared
  // -------------------------------------------------------------------------

  private async raiseDispute(b: Booking, raisedBy: MessageSender, userId: string, reason: string) {
    const windowOpen = b.status === "IN_PROGRESS" || (b.status === "COMPLETED" && (await this.prisma.partnerPayout.count({ where: { bookingId: b.id, status: "HELD" } })) > 0);
    if (!windowOpen) throw new BadRequestException("A dispute can be raised while the job is in progress or within 48 hours of sign-off.");
    await this.prisma.$transaction([
      this.prisma.dispute.create({ data: { bookingId: b.id, raisedBy, raisedById: userId, reason } }),
      this.prisma.booking.update({ where: { id: b.id }, data: { status: "DISPUTED" } }),
    ]);
    await this.notifications.booking("BOOKING_DISPUTED", b.id, { disputeReason: reason });
  }

  private async postMessage(b: Booking, sender: MessageSender, authorId: string, body: string) {
    if (!chatOpen(b.status)) throw new BadRequestException("Chat opens once a partner is assigned.");
    const { text, hits } = redactContactDetails(body);
    await this.prisma.bookingMessage.create({ data: { bookingId: b.id, sender, authorId, body: text, wasRedacted: hits.length > 0 } });
    if (hits.length) await this.flagRedaction(b, sender, hits, "chat message");
  }

  private flagRedaction(b: Booking, sender: MessageSender, hits: string[], where: string) {
    return this.prisma.circumventionFlag.create({
      data: {
        signal: "REDACTION_HIT",
        detail: `${sender === "PARTNER" ? "Partner" : "Customer"} ${where} on ${b.reference} contained: ${[...new Set(hits)].join(", ")}`,
        bookingId: b.id,
        partnerId: b.assignedPartnerId,
        userId: b.userId,
      },
    });
  }

  private async partnerIdOf(user: AuthUser): Promise<string> {
    const row = await this.prisma.user.findUnique({ where: { id: user.id }, select: { hirePartnerId: true, hirePartner: { select: { status: true } } } });
    if (!row?.hirePartnerId || !row.hirePartner) throw new ForbiddenException("This login isn't linked to a partner.");
    if (row.hirePartner.status === "SUSPENDED") throw new ForbiddenException("Your partner account is suspended. Contact our partnerships team.");
    return row.hirePartnerId;
  }

  private async assigned(id: string, user: AuthUser) {
    const partnerId = await this.partnerIdOf(user);
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b || b.assignedPartnerId !== partnerId) throw new NotFoundException("Job not found.");
    return b;
  }

  private async owned(id: string, user: AuthUser) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b || b.userId !== user.id) throw new NotFoundException("Booking not found.");
    return b;
  }

  private async get(id: string) {
    const b = await this.prisma.booking.findUnique({ where: { id } });
    if (!b) throw new NotFoundException("Booking not found.");
    return b;
  }

  private async wrongState(id: string, expected: string) {
    const b = await this.prisma.booking.findUnique({ where: { id }, select: { status: true } });
    return b ? new BadRequestException(`This booking isn't ${expected} (it's ${b.status.toLowerCase().replace(/_/g, " ")}).`) : new NotFoundException("Booking not found.");
  }
}
