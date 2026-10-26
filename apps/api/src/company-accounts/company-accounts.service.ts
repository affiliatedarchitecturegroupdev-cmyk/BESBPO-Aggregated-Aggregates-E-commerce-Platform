import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CompanyRole, OrderApprovalStatus, OrderStatus, UserRole } from "@aggregates/database";
import { createHash, randomBytes } from "node:crypto";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { companyInviteEmail } from "../notifications/account-emails";
import { siteUrl } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { canApprove, canManage, COMPANY_ROLE_LABEL, companyRoleOf } from "./company-accounts";

const INVITE_VALID_DAYS = 14;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Member = { id: string; role: UserRole; companyId: string | null; companyRole: CompanyRole | null };

/**
 * Company accounts with several users (ROADMAP 6.1, docs/company-accounts.md). A company's admin invites colleagues
 * by email as buyers, approvers or accounts people, sets buyers' limits per order and the company's approval
 * threshold, and can require a purchase-order number on every order. Buyers' orders above a limit wait for an
 * approver before they can be paid.
 */
@Injectable()
export class CompanyAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The signed-in member, with their role in the company. */
  async member(user: AuthUser) {
    const row = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { id: true, name: true, email: true, role: true, companyId: true, companyRole: true, spendLimit: true } });
    return { ...row, companyRole: companyRoleOf(row) };
  }

  private async requireRole(user: AuthUser, allowed: (role: CompanyRole | null) => boolean, message: string) {
    const me = await this.member(user);
    if (!me.companyId) throw new ForbiddenException("Your account isn't part of a company account.");
    if (!allowed(me.companyRole)) throw new ForbiddenException(message);
    return me as typeof me & { companyId: string };
  }

  /** The team page: members, open invitations, settings and orders waiting for approval. */
  async team(user: AuthUser) {
    const me = await this.member(user);
    if (!me.companyId) throw new ForbiddenException("Your account isn't part of a company account.");
    const [company, members, invites, awaiting] = await Promise.all([
      this.prisma.company.findUniqueOrThrow({ where: { id: me.companyId }, select: { id: true, name: true, status: true, approvalThreshold: true, requirePurchaseOrder: true } }),
      this.prisma.user.findMany({ where: { companyId: me.companyId }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, role: true, companyId: true, companyRole: true, spendLimit: true, createdAt: true } }),
      canManage(me.companyRole)
        ? this.prisma.companyInvite.findMany({ where: { companyId: me.companyId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, select: { id: true, email: true, role: true, spendLimit: true, createdAt: true, expiresAt: true } })
        : Promise.resolve([]),
      this.awaiting(me),
    ]);
    return {
      company,
      me: { id: me.id, companyRole: me.companyRole, spendLimit: me.spendLimit },
      members: members.map((m) => ({ id: m.id, name: m.name, email: m.email, companyRole: companyRoleOf(m), spendLimit: m.spendLimit, joinedAt: m.createdAt, isYou: m.id === me.id })),
      invites,
      awaiting,
    };
  }

  private async awaiting(me: { id: string; companyId: string | null; companyRole: CompanyRole | null }) {
    if (!me.companyId) return [];
    const where = { companyId: me.companyId, approvalStatus: OrderApprovalStatus.AWAITING, status: { not: OrderStatus.CANCELLED } };
    // Buyers see their own orders waiting; approvers and admins see the company's.
    const orders = await this.prisma.order.findMany({
      where: canApprove(me.companyRole) ? where : { ...where, userId: me.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, orderNumber: true, total: true, createdAt: true, approvalReason: true, purchaseOrderNumber: true, user: { select: { id: true, name: true, email: true } } },
    });
    return orders.map((o) => ({ ...o, canDecide: canApprove(me.companyRole) && o.user?.id !== me.id }));
  }

  // --- Invitations ------------------------------------------------------------------------------------------------

  async invite(user: AuthUser, dto: { email: string; companyRole: CompanyRole; spendLimit?: number | null }) {
    const me = await this.requireRole(user, canManage, "Only your company's account admin can invite people.");
    const email = dto.email.trim().toLowerCase();
    if (!EMAIL.test(email)) throw new BadRequestException("That isn't an email address.");
    const existing = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { companyId: true } });
    if (existing?.companyId === me.companyId) throw new ConflictException("They're already in your team.");
    if (existing?.companyId) throw new ConflictException("That person's account belongs to another company — they'd need to leave it first.");
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: me.companyId }, select: { name: true } });
    // A new invitation replaces any open one to the same address.
    await this.prisma.companyInvite.updateMany({ where: { companyId: me.companyId, email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const token = randomBytes(32).toString("base64url");
    const invite = await this.prisma.companyInvite.create({
      data: {
        companyId: me.companyId,
        email,
        role: dto.companyRole,
        spendLimit: dto.companyRole === CompanyRole.BUYER ? (dto.spendLimit ?? null) : null,
        tokenHash: hashToken(token),
        invitedById: me.id,
        expiresAt: new Date(Date.now() + INVITE_VALID_DAYS * 86_400_000),
      },
      select: { id: true, email: true, role: true, spendLimit: true, createdAt: true, expiresAt: true },
    });
    await this.notifications
      .system(
        "COMPANY_INVITE",
        email,
        companyInviteEmail({ companyName: company.name, inviterName: me.name, roleLabel: COMPANY_ROLE_LABEL[dto.companyRole], validDays: INVITE_VALID_DAYS }, `${siteUrl()}/account/team/join?token=${token}`),
        { companyId: me.companyId },
      )
      .catch(() => undefined);
    return invite;
  }

  async revokeInvite(user: AuthUser, inviteId: string) {
    const me = await this.requireRole(user, canManage, "Only your company's account admin can manage invitations.");
    const { count } = await this.prisma.companyInvite.updateMany({ where: { id: inviteId, companyId: me.companyId, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!count) throw new NotFoundException("Invitation not found.");
  }

  private async openInvite(token: string) {
    const invite = await this.prisma.companyInvite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { company: { select: { name: true } }, invitedBy: { select: { name: true } } },
    });
    if (!invite || invite.acceptedAt || invite.revokedAt) throw new NotFoundException("This invitation has been used or withdrawn — ask your company's account admin for a new one.");
    if (invite.expiresAt <= new Date()) throw new BadRequestException("This invitation has expired — ask your company's account admin for a new one.");
    return invite;
  }

  /** Public: what an invitation is for, so the join page can explain it before the person signs in. */
  async invitePreview(token: string) {
    const invite = await this.openInvite(token);
    return { companyName: invite.company.name, email: invite.email, companyRole: invite.role, roleLabel: COMPANY_ROLE_LABEL[invite.role], invitedBy: invite.invitedBy?.name ?? null, expiresAt: invite.expiresAt };
  }

  async acceptInvite(user: AuthUser, token: string) {
    const invite = await this.openInvite(token);
    if (user.email.toLowerCase() !== invite.email.toLowerCase()) throw new ForbiddenException(`This invitation is for ${invite.email} — sign in with that email address to accept it.`);
    if (user.role !== UserRole.CUSTOMER && user.role !== UserRole.COMPANY_ADMIN) throw new ForbiddenException("Staff, partner and supplier logins can't join a company account.");
    if (user.companyId && user.companyId !== invite.companyId) throw new ConflictException("Your account already belongs to another company.");
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { companyId: invite.companyId, companyRole: invite.role, spendLimit: invite.spendLimit, role: invite.role === CompanyRole.ADMIN ? UserRole.COMPANY_ADMIN : UserRole.CUSTOMER },
      }),
      this.prisma.companyInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
    ]);
    return { companyName: invite.company.name, companyRole: invite.role };
  }

  // --- Members and settings ---------------------------------------------------------------------------------------

  async updateMember(user: AuthUser, memberId: string, dto: { companyRole: CompanyRole; spendLimit?: number | null }) {
    const me = await this.requireRole(user, canManage, "Only your company's account admin can change roles.");
    const member = await this.prisma.user.findFirst({ where: { id: memberId, companyId: me.companyId }, select: { id: true, role: true, companyId: true, companyRole: true } });
    if (!member) throw new NotFoundException("Team member not found.");
    if (companyRoleOf(member) === CompanyRole.ADMIN && dto.companyRole !== CompanyRole.ADMIN) await this.keepAnAdmin(me.companyId);
    return this.prisma.user.update({
      where: { id: member.id },
      data: { companyRole: dto.companyRole, spendLimit: dto.companyRole === CompanyRole.BUYER ? (dto.spendLimit ?? null) : null, role: dto.companyRole === CompanyRole.ADMIN ? UserRole.COMPANY_ADMIN : UserRole.CUSTOMER },
      select: { id: true, companyRole: true, spendLimit: true },
    });
  }

  /** Takes someone off the company account. Their past orders stay with the company. */
  async removeMember(user: AuthUser, memberId: string) {
    const me = await this.requireRole(user, canManage, "Only your company's account admin can remove people.");
    const member = await this.prisma.user.findFirst({ where: { id: memberId, companyId: me.companyId }, select: { id: true, role: true, companyId: true, companyRole: true } });
    if (!member) throw new NotFoundException("Team member not found.");
    if (companyRoleOf(member) === CompanyRole.ADMIN) await this.keepAnAdmin(me.companyId);
    await this.prisma.user.update({ where: { id: member.id }, data: { companyId: null, companyRole: null, spendLimit: null, role: UserRole.CUSTOMER } });
  }

  /** A company always keeps at least one admin. */
  private async keepAnAdmin(companyId: string) {
    const admins = await this.prisma.user.count({ where: { companyId, role: UserRole.COMPANY_ADMIN } });
    if (admins <= 1) throw new BadRequestException("Your company needs at least one account admin — make someone else an admin first.");
  }

  async updateSettings(user: AuthUser, dto: { approvalThreshold?: number | null; requirePurchaseOrder?: boolean }) {
    const me = await this.requireRole(user, canManage, "Only your company's account admin can change these settings.");
    return this.prisma.company.update({
      where: { id: me.companyId },
      data: { ...(dto.approvalThreshold !== undefined ? { approvalThreshold: dto.approvalThreshold } : {}), ...(dto.requirePurchaseOrder !== undefined ? { requirePurchaseOrder: dto.requirePurchaseOrder } : {}) },
      select: { approvalThreshold: true, requirePurchaseOrder: true },
    });
  }

  // --- Approvals --------------------------------------------------------------------------------------------------

  /** An approver approves or declines a buyer's order. Declined orders are cancelled; approved ones can be paid. */
  async decide(user: AuthUser, orderId: string, dto: { decision: "APPROVE" | "DECLINE"; note?: string | null }) {
    const me = await this.requireRole(user, canApprove, "Only your company's approvers and account admins can approve orders.");
    const order = await this.prisma.order.findFirst({ where: { id: orderId, companyId: me.companyId }, select: { id: true, userId: true, approvalStatus: true, status: true } });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.approvalStatus !== OrderApprovalStatus.AWAITING || order.status === OrderStatus.CANCELLED) throw new BadRequestException("This order isn't waiting for approval.");
    if (order.userId === me.id) throw new ForbiddenException("Someone else in your company has to approve your own order.");
    const approve = dto.decision === "APPROVE";
    const now = new Date();
    const moved = await this.prisma.order.updateMany({
      where: { id: order.id, approvalStatus: OrderApprovalStatus.AWAITING },
      data: {
        approvalStatus: approve ? OrderApprovalStatus.APPROVED : OrderApprovalStatus.DECLINED,
        approvedById: me.id,
        approvalDecidedAt: now,
        approvalNote: dto.note?.trim().slice(0, 500) || null,
        ...(approve ? {} : { status: OrderStatus.CANCELLED, cancelledAt: now }),
      },
    });
    if (!moved.count) throw new BadRequestException("This order isn't waiting for approval.");
    await this.notifications.order("ORDER_APPROVAL_DECIDED", order.id);
    return this.prisma.order.findUniqueOrThrow({ where: { id: order.id }, select: { id: true, orderNumber: true, status: true, approvalStatus: true, approvalNote: true, approvalDecidedAt: true } });
  }
}
