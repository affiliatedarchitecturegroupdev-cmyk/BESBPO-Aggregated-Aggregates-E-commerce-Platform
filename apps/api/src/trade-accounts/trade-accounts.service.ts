import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { CompanyStatus, CustomerTierName, UserRole } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { ApplyForTradeAccountDto, CreateDeliveryAddressDto, ReviewApplicationDto } from "./dto/trade-account.dto";

/**
 * Trade account & customer tier management (Module 4): Retail, Contractor/
 * Trade (8% off), and Volume/Civil Bulk (15% off) — a registered company
 * account carries its tier, standing delivery addresses, and, for Volume
 * accounts, any standing supply agreement.
 *
 * A company applies for a tier and trades at Retail until staff approve it:
 * trade discounts are never self-service.
 */
@Injectable()
export class TradeAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  listCustomerTiers() {
    return this.prisma.customerTier.findMany({ orderBy: { discountPercent: "asc" } });
  }

  async apply(user: AuthUser, dto: ApplyForTradeAccountDto) {
    if (user.companyId) {
      throw new ConflictException("Your account already belongs to a company.");
    }
    const [retail, requested] = await Promise.all([
      this.tier(CustomerTierName.RETAIL),
      this.tier(dto.requestedTier),
    ]);
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName.trim(),
          registrationNumber: dto.registrationNumber?.trim() || null,
          vatNumber: dto.vatNumber?.trim() || null,
          contactPhone: dto.contactPhone?.trim() || null,
          applicationNotes: dto.notes?.trim() || null,
          status: CompanyStatus.PENDING,
          tierId: retail.id,
          requestedTierId: requested.id,
        },
      });
      // The applicant administers their company; staff keep their staff role.
      const role = user.role === UserRole.CUSTOMER ? UserRole.COMPANY_ADMIN : user.role;
      await tx.user.update({ where: { id: user.id }, data: { companyId: company.id, role } });
      return company;
    });
  }

  /** The signed-in user's company dashboard, or null if they haven't applied. */
  async myDashboard(user: AuthUser) {
    if (!user.companyId) return null;
    return this.prisma.company.findUnique({
      where: { id: user.companyId },
      include: {
        tier: true,
        requestedTier: true,
        deliveryAddresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { lineItems: { include: { product: { select: { name: true, sku: true } } } }, shipment: true },
        },
        quotes: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { lineItems: { include: { product: { select: { name: true, sku: true } } } } },
        },
        invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
  }

  async addDeliveryAddress(user: AuthUser, dto: CreateDeliveryAddressDto) {
    const companyId = this.requireCompany(user);
    const count = await this.prisma.deliveryAddress.count({ where: { companyId } });
    return this.prisma.deliveryAddress.create({ data: { ...dto, companyId, isDefault: count === 0 } });
  }

  async removeDeliveryAddress(user: AuthUser, addressId: string) {
    const companyId = this.requireCompany(user);
    const { count } = await this.prisma.deliveryAddress.deleteMany({ where: { id: addressId, companyId } });
    if (count === 0) throw new NotFoundException("Address not found.");
  }

  listApplications(status?: CompanyStatus) {
    return this.prisma.company.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        tier: true,
        requestedTier: true,
        users: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async review(companyId: string, dto: ReviewApplicationDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, include: { requestedTier: true } });
    if (!company) throw new NotFoundException("Company not found.");

    if (dto.decision === "DECLINE") {
      return this.prisma.company.update({
        where: { id: companyId },
        data: { status: CompanyStatus.DECLINED, tierId: (await this.tier(CustomerTierName.RETAIL)).id, reviewNotes: dto.notes, reviewedAt: new Date() },
        include: { tier: true },
      });
    }
    const tierName = dto.tier ?? company.requestedTier?.name;
    if (!tierName) throw new BadRequestException("Choose a tier to approve this company onto.");
    return this.prisma.company.update({
      where: { id: companyId },
      data: { status: CompanyStatus.APPROVED, tierId: (await this.tier(tierName)).id, reviewNotes: dto.notes, reviewedAt: new Date() },
      include: { tier: true },
    });
  }

  private requireCompany(user: AuthUser): string {
    if (!user.companyId) throw new ForbiddenException("Apply for a trade account first.");
    return user.companyId;
  }

  private async tier(name: CustomerTierName) {
    const tier = await this.prisma.customerTier.findUnique({ where: { name } });
    if (!tier) throw new NotFoundException(`Customer tier not seeded: ${name}`);
    return tier;
  }
}
