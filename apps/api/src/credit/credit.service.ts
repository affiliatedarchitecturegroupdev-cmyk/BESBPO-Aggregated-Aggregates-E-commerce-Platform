import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CreditStatus, Prisma } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { chargeRefusal, creditPosition, type CreditPosition } from "./credit";
import type { ApplyForCreditDto, DecideCreditDto } from "./credit.dto";

const ACCOUNT_ORDER_SELECT = { id: true, orderNumber: true, status: true, total: true, amountPaid: true, accountDueAt: true, paidAt: true, createdAt: true } satisfies Prisma.OrderSelect;

/**
 * Trade credit (docs/trade-credit.md). An approved trade company's admin
 * applies; staff approve a limit and terms. Orders then go "on account":
 * confirmed and delivered before payment, each due within the terms. The
 * account is never charged past its limit, and an overdue order stops new
 * orders on account until it's paid.
 */
@Injectable()
export class CreditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** A company's position: limit, used, overdue, available. */
  async position(companyId: string, now = new Date()): Promise<CreditPosition> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { creditStatus: true, creditLimit: true, paymentTermsDays: true } });
    if (!company) throw new NotFoundException("Company not found.");
    const orders = await this.prisma.order.findMany({ where: { companyId, paymentPlan: "ACCOUNT", status: { not: "CANCELLED" } }, select: ACCOUNT_ORDER_SELECT });
    return creditPosition(company, orders, now);
  }

  /** Whether `amount` can go on the company's account right now (for the payment tiles). */
  async canCharge(companyId: string | null, amount: number): Promise<boolean> {
    if (!companyId) return false;
    const position = await this.position(companyId).catch(() => null);
    return position !== null && chargeRefusal(position, amount) === null;
  }

  /** Throws with the reason if `amount` can't go on account. Returns the terms to apply. */
  async assertCanCharge(companyId: string | null, amount: number): Promise<{ termsDays: number }> {
    if (!companyId) throw new BadRequestException("Trade accounts are for registered companies.");
    const position = await this.position(companyId);
    const refusal = chargeRefusal(position, amount);
    if (refusal) throw new BadRequestException(refusal);
    return { termsDays: position.termsDays ?? 30 };
  }

  // -------------------------------------------------------------------------
  // The company
  // -------------------------------------------------------------------------

  async mine(user: AuthUser) {
    if (!user.companyId) return null;
    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { id: true, name: true, status: true, creditStatus: true, creditLimit: true, paymentTermsDays: true, creditAppliedAt: true, creditReviewedAt: true, creditNotes: true },
    });
    if (!company) return null;
    const now = new Date();
    const orders = await this.prisma.order.findMany({ where: { companyId: company.id, paymentPlan: "ACCOUNT" }, orderBy: { createdAt: "desc" }, take: 50, select: ACCOUNT_ORDER_SELECT });
    return {
      ...company,
      creditLimit: company.creditLimit !== null ? Number(company.creditLimit) : null,
      canApply: company.status === "APPROVED" && ["NONE", "DECLINED"].includes(company.creditStatus) && user.role === "COMPANY_ADMIN",
      position: creditPosition(company, orders, now),
      orders: orders.map((o) => this.accountOrder(o, now)),
    };
  }

  async apply(user: AuthUser, dto: ApplyForCreditDto) {
    if (!user.companyId) throw new ForbiddenException("Apply for a trade account first.");
    if (user.role !== "COMPANY_ADMIN") throw new ForbiddenException("Your company's account administrator applies for trade credit.");
    const company = await this.prisma.company.findUnique({ where: { id: user.companyId } });
    if (!company) throw new NotFoundException("Company not found.");
    if (company.status !== "APPROVED") throw new BadRequestException("Trade credit is for approved trade accounts — we'll review your trade account first.");
    if (company.creditStatus === "APPLIED") throw new BadRequestException("Your application is with our team already.");
    if (company.creditStatus === "APPROVED" || company.creditStatus === "SUSPENDED") throw new BadRequestException("Your company already has a trade credit account — contact us to change it.");
    const application = {
      requestedLimit: dto.requestedLimit,
      requestedTermsDays: dto.requestedTermsDays,
      yearsTrading: dto.yearsTrading,
      estimatedMonthlySpend: dto.estimatedMonthlySpend ?? null,
      tradeReferences: dto.tradeReferences.trim(),
      accountsContact: dto.accountsContact?.trim() || null,
      notes: dto.notes?.trim() || null,
      acceptedTermsAt: new Date().toISOString(),
      appliedBy: { id: user.id, email: user.email, name: user.name },
    };
    await this.prisma.company.update({
      where: { id: company.id },
      data: { creditStatus: "APPLIED", creditApplication: application as Prisma.InputJsonValue, creditAppliedAt: new Date(), creditNotes: null },
    });
    await this.notifications.company("CREDIT_APPLIED", company.id);
    return this.mine(user);
  }

  // -------------------------------------------------------------------------
  // Staff
  // -------------------------------------------------------------------------

  async list(status?: Exclude<CreditStatus, "NONE">) {
    const companies = await this.prisma.company.findMany({
      where: status ? { creditStatus: status } : { creditStatus: { not: "NONE" } },
      orderBy: [{ creditAppliedAt: { sort: "desc", nulls: "last" } }],
      include: { tier: true, users: { select: { email: true, name: true, role: true } } },
    });
    const now = new Date();
    const orders = await this.prisma.order.findMany({ where: { companyId: { in: companies.map((c) => c.id) }, paymentPlan: "ACCOUNT", status: { not: "CANCELLED" } }, select: { ...ACCOUNT_ORDER_SELECT, companyId: true } });
    return companies.map((c) => ({
      id: c.id,
      name: c.name,
      tier: c.tier.name,
      registrationNumber: c.registrationNumber,
      vatNumber: c.vatNumber,
      creditStatus: c.creditStatus,
      creditLimit: c.creditLimit !== null ? Number(c.creditLimit) : null,
      paymentTermsDays: c.paymentTermsDays,
      creditApplication: c.creditApplication,
      creditAppliedAt: c.creditAppliedAt,
      creditReviewedAt: c.creditReviewedAt,
      creditNotes: c.creditNotes,
      users: c.users,
      position: creditPosition(c, orders.filter((o) => o.companyId === c.id), now),
    }));
  }

  /** Staff: every unpaid order on account, the most overdue first. */
  async receivables() {
    const now = new Date();
    const orders = await this.prisma.order.findMany({
      where: { paymentPlan: "ACCOUNT", status: { not: "CANCELLED" } },
      orderBy: { accountDueAt: "asc" },
      take: 500,
      select: { ...ACCOUNT_ORDER_SELECT, company: { select: { id: true, name: true } } },
    });
    return orders.map((o) => ({ ...this.accountOrder(o, now), company: o.company })).filter((o) => o.balance > 0.01);
  }

  async decide(companyId: string, dto: DecideCreditDto, staff: AuthUser) {
    if (!STAFF_ROLES.includes(staff.role)) throw new ForbiddenException();
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException("Company not found.");
    const notes = dto.notes?.trim() || null;
    let data: Prisma.CompanyUpdateInput;
    if (dto.decision === "APPROVE") {
      if (company.status !== "APPROVED") throw new BadRequestException("Approve the company's trade account first.");
      const requested = (company.creditApplication ?? {}) as { requestedLimit?: number; requestedTermsDays?: number };
      const limit = dto.limit ?? requested.requestedLimit;
      const termsDays = dto.termsDays ?? requested.requestedTermsDays;
      if (!limit || !termsDays) throw new BadRequestException("Set the credit limit and the payment terms.");
      data = { creditStatus: "APPROVED", creditLimit: limit, paymentTermsDays: termsDays, creditReviewedAt: new Date(), creditNotes: notes };
    } else if (dto.decision === "DECLINE") {
      if (company.creditStatus === "APPROVED" || company.creditStatus === "SUSPENDED") throw new BadRequestException("Suspend an account that's already open, rather than declining it.");
      data = { creditStatus: "DECLINED", creditReviewedAt: new Date(), creditNotes: notes };
    } else {
      if (company.creditStatus !== "APPROVED") throw new BadRequestException("Only an open account can be suspended.");
      if (!notes) throw new BadRequestException("Say why the account is suspended — the company sees it.");
      // Orders already on account stay owed on their terms; new orders can't go on account.
      data = { creditStatus: "SUSPENDED", creditReviewedAt: new Date(), creditNotes: notes };
    }
    const before = { status: company.creditStatus, limit: company.creditLimit !== null ? Number(company.creditLimit) : null, terms: company.paymentTermsDays };
    const updated = await this.prisma.company.update({ where: { id: companyId }, data });
    const changed = before.status !== updated.creditStatus || before.limit !== (updated.creditLimit !== null ? Number(updated.creditLimit) : null) || before.terms !== updated.paymentTermsDays;
    if (changed) await this.notifications.company("CREDIT_DECIDED", companyId);
    return (await this.list()).find((c) => c.id === companyId);
  }

  private accountOrder(o: Prisma.OrderGetPayload<{ select: typeof ACCOUNT_ORDER_SELECT }>, now: Date) {
    const balance = Math.round((Number(o.total) - Number(o.amountPaid)) * 100) / 100;
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      amountPaid: Number(o.amountPaid),
      balance: Math.max(0, balance),
      accountDueAt: o.accountDueAt,
      overdue: balance > 0.01 && o.accountDueAt !== null && o.accountDueAt < now && o.status !== "CANCELLED",
      createdAt: o.createdAt,
    };
  }
}
