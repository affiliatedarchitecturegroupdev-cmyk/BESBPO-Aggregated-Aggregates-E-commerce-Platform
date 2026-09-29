import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Prisma } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import type { CreateDeliveryAddressDto } from "../trade-accounts/dto/trade-account.dto";

/**
 * The signed-in customer's own account: name, password and saved delivery
 * sites. A trade company's sites are shared by everyone in the company; a
 * customer without a company keeps personal ones. Both show at checkout.
 */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(user: AuthUser, name: string) {
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { name: name.trim() || null }, select: { id: true, name: true, email: true } });
    return updated;
  }

  async changePassword(user: AuthUser, currentPassword: string | undefined, newPassword: string) {
    const account = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
    if (account.passwordHash) {
      if (!currentPassword || !(await bcrypt.compare(currentPassword, account.passwordHash))) {
        throw new BadRequestException("Your current password isn't right.");
      }
      if (await bcrypt.compare(newPassword, account.passwordHash)) throw new BadRequestException("Choose a password you haven't used for this account.");
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } });
  }

  /** Company sites first (if any), then personal ones; defaults first within each. */
  async addresses(user: AuthUser) {
    const rows = await this.prisma.deliveryAddress.findMany({
      where: { OR: [{ userId: user.id }, ...(user.companyId ? [{ companyId: user.companyId }] : [])] },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
    return rows
      .map((a) => ({ ...a, shared: a.companyId !== null }))
      .sort((a, b) => Number(b.shared) - Number(a.shared));
  }

  async addAddress(user: AuthUser, dto: CreateDeliveryAddressDto) {
    const owner = this.ownerFor(user);
    const count = await this.prisma.deliveryAddress.count({ where: owner });
    if (count >= 50) throw new BadRequestException("You can save up to 50 delivery sites.");
    return this.prisma.deliveryAddress.create({
      data: {
        ...owner,
        label: dto.label.trim(),
        addressLine1: dto.addressLine1.trim(),
        addressLine2: dto.addressLine2?.trim() || null,
        city: dto.city.trim(),
        province: dto.province.trim(),
        postalCode: dto.postalCode.trim(),
        isDefault: count === 0,
      },
    });
  }

  async setDefault(user: AuthUser, id: string) {
    const address = await this.find(user, id);
    const scope: Prisma.DeliveryAddressWhereInput = address.companyId ? { companyId: address.companyId } : { userId: address.userId };
    await this.prisma.$transaction([
      this.prisma.deliveryAddress.updateMany({ where: { ...scope, isDefault: true }, data: { isDefault: false } }),
      this.prisma.deliveryAddress.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return this.addresses(user);
  }

  async removeAddress(user: AuthUser, id: string) {
    const address = await this.find(user, id);
    await this.prisma.deliveryAddress.delete({ where: { id } });
    if (address.isDefault) {
      // Keep one default per company / person while any sites remain.
      const scope: Prisma.DeliveryAddressWhereInput = address.companyId ? { companyId: address.companyId } : { userId: address.userId };
      const next = await this.prisma.deliveryAddress.findFirst({ where: scope, orderBy: { createdAt: "asc" } });
      if (next) await this.prisma.deliveryAddress.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  private ownerFor(user: AuthUser) {
    return user.companyId ? { companyId: user.companyId } : { userId: user.id };
  }

  private async find(user: AuthUser, id: string) {
    const address = await this.prisma.deliveryAddress.findFirst({
      where: { id, OR: [{ userId: user.id }, ...(user.companyId ? [{ companyId: user.companyId }] : [])] },
    });
    if (!address) throw new NotFoundException("Address not found.");
    return address;
  }
}
