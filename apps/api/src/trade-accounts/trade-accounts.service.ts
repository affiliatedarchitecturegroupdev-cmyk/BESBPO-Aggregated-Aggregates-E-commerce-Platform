import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { CreateCompanyDto } from "./dto/create-company.dto";

/**
 * Trade account & customer tier management (Module 4): Retail, Contractor/
 * Trade (8% off), and Volume/Civil Bulk (15% off) — a registered company
 * account carries its tier, standing delivery addresses, and, for Volume
 * accounts, any standing supply agreement.
 */
@Injectable()
export class TradeAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async createCompany(dto: CreateCompanyDto) {
    const tier = await this.prisma.customerTier.findUnique({ where: { name: dto.tier } });
    if (!tier) {
      throw new NotFoundException(`Customer tier not seeded: ${dto.tier}`);
    }
    return this.prisma.company.create({
      data: {
        name: dto.name,
        registrationNumber: dto.registrationNumber,
        vatNumber: dto.vatNumber,
        tierId: tier.id,
      },
      include: { tier: true },
    });
  }

  async getCompanyDashboard(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        tier: true,
        deliveryAddresses: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: { lineItems: { include: { product: true } }, shipment: true },
        },
        invoices: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
    if (!company) {
      throw new NotFoundException(`Company not found: ${companyId}`);
    }
    return company;
  }

  listCustomerTiers() {
    return this.prisma.customerTier.findMany();
  }
}
