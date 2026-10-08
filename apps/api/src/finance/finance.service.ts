import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import type { CreateRefundDto, OperatingCostDto, SaveDeliveryRatesDto } from "./finance.dto";

const monthStart = (ym: string) => new Date(`${ym}-01T00:00:00.000Z`);
const money = (v: Prisma.Decimal | number | null | undefined) => (v == null ? 0 : Number(v));

/**
 * Finance foundations for the sales dashboard (ANALYTICS.md, Phase 1):
 * refunds, monthly operating costs, standard delivery costs, test-data flags
 * and a data-quality summary. Everything here is ex VAT except refunds, which
 * record what was actually paid back.
 */
@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Refunds (staff and admins) -----------------------------------------

  async createRefund(dto: CreateRefundDto, user: AuthUser) {
    if (!dto.orderId === !dto.bookingId) throw new BadRequestException("A refund is for exactly one order or one booking.");
    let paidTotal: number;
    let already: number;
    if (dto.orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: dto.orderId }, select: { paidAt: true, total: true, refunds: { select: { amount: true } } } });
      if (!order) throw new NotFoundException("Order not found.");
      if (!order.paidAt) throw new BadRequestException("This order hasn't been paid, so there's nothing to refund.");
      paidTotal = money(order.total);
      already = order.refunds.reduce((n, r) => n + money(r.amount), 0);
    } else {
      const booking = await this.prisma.booking.findUnique({ where: { id: dto.bookingId! }, select: { paidAt: true, customerTotal: true, refunds: { select: { amount: true } } } });
      if (!booking) throw new NotFoundException("Booking not found.");
      if (!booking.paidAt) throw new BadRequestException("This booking hasn't been paid, so there's nothing to refund.");
      paidTotal = money(booking.customerTotal);
      already = booking.refunds.reduce((n, r) => n + money(r.amount), 0);
    }
    const remaining = Math.round((paidTotal - already) * 100) / 100;
    if (dto.amount > remaining + 1e-9) {
      throw new BadRequestException(`That's more than is left to refund (R${remaining.toFixed(2)} of R${paidTotal.toFixed(2)}).`);
    }
    return this.prisma.refund.create({
      data: {
        orderId: dto.orderId ?? null,
        bookingId: dto.bookingId ?? null,
        amount: dto.amount,
        reason: dto.reason,
        reference: dto.reference ?? null,
        refundedAt: dto.refundedOn ? new Date(`${dto.refundedOn}T12:00:00.000Z`) : new Date(),
        createdById: user.id,
      },
    });
  }

  listRefunds(filter: { orderId?: string; bookingId?: string }) {
    return this.prisma.refund.findMany({
      where: { orderId: filter.orderId, bookingId: filter.bookingId },
      orderBy: { refundedAt: "desc" },
      take: 200,
      include: { order: { select: { orderNumber: true } }, booking: { select: { reference: true } } },
    });
  }

  /** Admins: remove a refund recorded in error. */
  async deleteRefund(id: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id }, select: { id: true } });
    if (!refund) throw new NotFoundException("Refund not found.");
    await this.prisma.refund.delete({ where: { id } });
  }

  // --- Operating costs (admins) -------------------------------------------

  listOperatingCosts(from?: string, to?: string) {
    return this.prisma.operatingCost.findMany({
      where: { month: { ...(from ? { gte: monthStart(from) } : {}), ...(to ? { lte: monthStart(to) } : {}) } },
      orderBy: [{ month: "desc" }, { category: "asc" }],
      take: 500,
    });
  }

  createOperatingCost(dto: OperatingCostDto, user: AuthUser) {
    return this.prisma.operatingCost.create({
      data: { month: monthStart(dto.month), category: dto.category, description: dto.description, amountExVat: dto.amountExVat, createdById: user.id },
    });
  }

  async updateOperatingCost(id: string, dto: OperatingCostDto) {
    await this.getOperatingCost(id);
    return this.prisma.operatingCost.update({
      where: { id },
      data: { month: monthStart(dto.month), category: dto.category, description: dto.description, amountExVat: dto.amountExVat },
    });
  }

  async deleteOperatingCost(id: string) {
    await this.getOperatingCost(id);
    await this.prisma.operatingCost.delete({ where: { id } });
  }

  // --- Standard delivery costs (admins) -----------------------------------

  async deliveryRates() {
    const [rates, bands] = await Promise.all([
      this.prisma.deliveryCostRate.findMany({ orderBy: [{ carrier: "asc" }, { bandLabel: "asc" }, { load: "asc" }] }),
      this.prisma.deliveryBand.findMany({ orderBy: { minKm: "asc" }, select: { label: true, minKm: true, maxKm: true } }),
    ]);
    const seen = new Set<string>();
    const distanceBands = bands.filter((b) => (seen.has(b.label) ? false : (seen.add(b.label), true)));
    return { rates, distanceBands };
  }

  async saveDeliveryRates(dto: SaveDeliveryRatesDto) {
    await this.prisma.$transaction(
      dto.rates.map((r) =>
        r.costExVat === null
          ? this.prisma.deliveryCostRate.deleteMany({ where: { carrier: r.carrier, bandLabel: r.bandLabel, load: r.load } })
          : this.prisma.deliveryCostRate.upsert({
              where: { carrier_bandLabel_load: { carrier: r.carrier, bandLabel: r.bandLabel, load: r.load } },
              create: { carrier: r.carrier, bandLabel: r.bandLabel, load: r.load, costExVat: r.costExVat },
              update: { costExVat: r.costExVat },
            }),
      ),
    );
    return this.deliveryRates();
  }

  // --- Test data (admins) -------------------------------------------------

  async setOrderTest(id: string, isTest: boolean) {
    const found = await this.prisma.order.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException("Order not found.");
    return this.prisma.order.update({ where: { id }, data: { isTest }, select: { id: true, orderNumber: true, isTest: true } });
  }

  async setBookingTest(id: string, isTest: boolean) {
    const found = await this.prisma.booking.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException("Booking not found.");
    return this.prisma.booking.update({ where: { id }, data: { isTest }, select: { id: true, reference: true, isTest: true } });
  }

  // --- Data quality (admins) ----------------------------------------------

  /** What's missing before the dashboard's profit figures can be trusted. */
  async dataQuality() {
    const paid = { paidAt: { not: null }, isTest: false } satisfies Prisma.OrderWhereInput;
    const [paidOrders, linesMissingCost, linesEstimated, ordersEstimatedTimes, noPaymentMethod, dispatchedNoCost, testOrders, testBookings, rates, opexMonths] = await Promise.all([
      this.prisma.order.count({ where: paid }),
      this.prisma.orderLineItem.count({ where: { order: paid, unitCost: null } }),
      this.prisma.orderLineItem.count({ where: { order: paid, costSource: "ESTIMATED" } }),
      this.prisma.order.count({ where: { ...paid, timestampsEstimated: true } }),
      this.prisma.order.count({ where: { ...paid, paymentMethod: null } }),
      this.prisma.shipment.count({
        where: { dispatchedAt: { not: null }, deliveryCost: null, order: { isTest: false, lineItems: { some: { OR: [{ pricingFamily: null }, { pricingFamily: { not: "READY_MIX" } }] } } } },
      }),
      this.prisma.order.count({ where: { isTest: true } }),
      this.prisma.booking.count({ where: { isTest: true } }),
      this.prisma.deliveryCostRate.count(),
      this.prisma.operatingCost.groupBy({ by: ["month"], _count: { _all: true } }),
    ]);
    return {
      paidOrders,
      linesMissingCost,
      linesEstimated,
      ordersEstimatedTimes,
      paidOrdersWithoutPaymentMethod: noPaymentMethod,
      dispatchedWithoutDeliveryCost: dispatchedNoCost,
      testOrders,
      testBookings,
      deliveryRatesSet: rates,
      monthsWithOperatingCosts: opexMonths.length,
    };
  }

  private async getOperatingCost(id: string) {
    const row = await this.prisma.operatingCost.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Operating cost not found.");
    return row;
  }
}
