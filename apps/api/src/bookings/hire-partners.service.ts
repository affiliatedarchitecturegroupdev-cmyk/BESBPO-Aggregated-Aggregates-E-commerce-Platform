import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { PricingService } from "../pricing/pricing.service";
import type { FleetUnitDto, HirePartnerDto } from "./bookings.dto";

/**
 * Staff manage the plant-hire / site-services partner network: partners
 * (contact details stay staff-only), their portal logins and their fleet.
 * A partner is offered work only when ACTIVE with an active fleet unit for
 * the job's SKU in the job's province.
 */
@Injectable()
export class HirePartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
  ) {}

  list() {
    return this.prisma.hirePartner.findMany({
      orderBy: [{ status: "asc" }, { name: "asc" }],
      include: {
        users: { select: { id: true, email: true, name: true } },
        fleet: { orderBy: { createdAt: "asc" } },
        _count: { select: { bookings: true } },
      },
    });
  }

  create(dto: HirePartnerDto) {
    this.checkPin(dto);
    return this.prisma.hirePartner.create({ data: this.data(dto) });
  }

  async update(id: string, dto: HirePartnerDto) {
    await this.get(id);
    this.checkPin(dto);
    return this.prisma.hirePartner.update({ where: { id }, data: this.data(dto) });
  }

  /** Link a registered account as this partner's portal login. Staff, admins and company admins can't be partners. */
  async linkUser(id: string, email: string) {
    await this.get(id);
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, role: true, hirePartnerId: true } });
    if (!user) throw new NotFoundException("No account uses that email. Ask the partner to create one on the site first.");
    if (user.role !== "CUSTOMER" && user.role !== "PARTNER") throw new BadRequestException("Staff, admin and trade-company admin accounts can't be partner logins.");
    if (user.hirePartnerId && user.hirePartnerId !== id) throw new BadRequestException("That account is already linked to another partner.");
    await this.prisma.user.update({ where: { id: user.id }, data: { role: "PARTNER", hirePartnerId: id } });
    return this.list();
  }

  async unlinkUser(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { hirePartnerId: true } });
    if (!user || user.hirePartnerId !== id) throw new NotFoundException("That login isn't linked to this partner.");
    await this.prisma.user.update({ where: { id: userId }, data: { role: "CUSTOMER", hirePartnerId: null } });
    return this.list();
  }

  async addFleet(id: string, dto: FleetUnitDto) {
    await this.get(id);
    const catalogue = await this.pricing.hireCatalogue();
    if (!catalogue.items.has(dto.sku)) throw new BadRequestException(`${dto.sku} isn't in the plant-hire or site-services catalogue.`);
    await this.prisma.partnerFleetUnit.create({ data: { partnerId: id, sku: dto.sku, label: dto.label, province: dto.province } });
    return this.list();
  }

  async setFleetActive(unitId: string, isActive: boolean) {
    const unit = await this.prisma.partnerFleetUnit.findUnique({ where: { id: unitId } });
    if (!unit) throw new NotFoundException("Fleet unit not found.");
    await this.prisma.partnerFleetUnit.update({ where: { id: unitId }, data: { isActive } });
    return this.list();
  }

  /**
   * Public: provinces where at least one ACTIVE partner has active fleet, and
   * which machines/services are covered there. No partner names, counts or
   * contact details — province pages are published only from this.
   */
  async coverage() {
    const units = await this.prisma.partnerFleetUnit.findMany({
      where: { isActive: true, partner: { status: "ACTIVE" } },
      select: { province: true, sku: true },
    });
    const byProvince = new Map<string, Set<string>>();
    for (const u of units) byProvince.set(u.province, (byProvince.get(u.province) ?? new Set()).add(u.sku));
    return [...byProvince].map(([province, skus]) => ({ province, skus: [...skus].sort() })).sort((a, b) => a.province.localeCompare(b.province));
  }

  private checkPin(dto: HirePartnerDto) {
    const lat = dto.latitude ?? null;
    const lng = dto.longitude ?? null;
    if ((lat === null) !== (lng === null)) throw new BadRequestException("Give both latitude and longitude from a map, or neither.");
  }

  private data(dto: HirePartnerDto) {
    return {
      name: dto.name,
      province: dto.province,
      town: dto.town ?? null,
      contactName: dto.contactName ?? null,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone ?? null,
      ...(dto.status ? { status: dto.status } : {}),
      ...(dto.isGroupEntity !== undefined ? { isGroupEntity: dto.isGroupEntity } : {}),
      ...(dto.payoutDetailsConfirmed !== undefined ? { payoutDetailsConfirmed: dto.payoutDetailsConfirmed } : {}),
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      notes: dto.notes ?? null,
    };
  }

  private async get(id: string) {
    const partner = await this.prisma.hirePartner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException("Partner not found.");
    return partner;
  }
}
