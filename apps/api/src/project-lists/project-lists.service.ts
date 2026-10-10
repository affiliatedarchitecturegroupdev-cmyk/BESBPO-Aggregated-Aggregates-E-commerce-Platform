import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { Prisma, UnitOfSale } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import type { AuthUser } from "../common/auth/auth-user";
import { PACKAGED_UNITS } from "../pricing/pricing.service";
import { unitOfSale } from "../pricing/units";
import type { ItemDto, ListDto, UpdateItemDto, UpdateListDto } from "./project-lists.dto";

export const LIMITS = { lists: 25, items: 80 } as const;
const UNITS = ["ton", "m3", "bag", ...PACKAGED_UNITS] as const;
const WHOLE_UNITS = (u: string) => u !== "ton" && u !== "m3";

const ITEM_FIELDS = { id: true, sku: true, unit: true, quantity: true, stage: true, note: true, createdAt: true } as const;
const LIST_FIELDS = { id: true, name: true, siteName: true, province: true, neededBy: true, notes: true, shareToken: true, createdAt: true, updatedAt: true } as const;

type ItemRow = { quantity: Prisma.Decimal | null; [k: string]: unknown };
const item = <T extends ItemRow>(i: T) => ({ ...i, quantity: i.quantity === null ? null : Number(i.quantity) });
const list = <T extends { neededBy: Date | null; items?: ItemRow[] }>(l: T) => ({
  ...l,
  neededBy: l.neededBy?.toISOString().slice(0, 10) ?? null,
  ...(l.items ? { items: l.items.map(item) } : {}),
});
const date = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(`${v.slice(0, 10)}T00:00:00Z`));

/**
 * Project lists (PROJECT_LISTS.md): a signed-in customer's materials saved
 * against a named job, by build stage, with or without quantities. Prices
 * aren't stored — the storefront shows today's price and the pricing service
 * re-prices everything at the cart or quote.
 */
@Injectable()
export class ProjectListsService {
  constructor(private readonly prisma: PrismaService) {}

  async all(user: AuthUser) {
    const lists = await this.prisma.projectList.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { ...LIST_FIELDS, items: { select: { sku: true, unit: true, quantity: true, stage: true } } },
    });
    return lists.map(list);
  }

  async create(user: AuthUser, dto: ListDto) {
    if ((await this.prisma.projectList.count({ where: { userId: user.id } })) >= LIMITS.lists) {
      throw new ConflictException(`You can keep up to ${LIMITS.lists} project lists — delete one you've finished with.`);
    }
    const created = await this.prisma.projectList.create({
      data: { userId: user.id, name: dto.name, siteName: dto.siteName ?? null, province: dto.province ?? null, neededBy: date(dto.neededBy) ?? null, notes: dto.notes ?? null },
      select: LIST_FIELDS,
    });
    return list(created);
  }

  async one(user: AuthUser, id: string) {
    const found = await this.prisma.projectList.findFirst({ where: { id, userId: user.id }, select: { ...LIST_FIELDS, items: { orderBy: { createdAt: "asc" }, select: ITEM_FIELDS } } });
    if (!found) throw new NotFoundException("Project list not found.");
    return list(found);
  }

  async update(user: AuthUser, id: string, dto: UpdateListDto) {
    await this.own(user, id);
    await this.prisma.projectList.update({
      where: { id },
      data: { name: dto.name, siteName: dto.siteName, province: dto.province, neededBy: date(dto.neededBy), notes: dto.notes },
    });
    return this.one(user, id);
  }

  async remove(user: AuthUser, id: string) {
    await this.own(user, id);
    await this.prisma.projectList.delete({ where: { id } });
  }

  /** Save a product to the list; saving the same product and unit again updates it. */
  async addItem(user: AuthUser, id: string, dto: ItemDto) {
    await this.own(user, id);
    await this.checkProduct(dto.sku, dto.unit, dto.quantity);
    const existing = await this.prisma.projectListItem.findUnique({ where: { listId_sku_unit: { listId: id, sku: dto.sku, unit: dto.unit } }, select: { id: true } });
    if (!existing && (await this.prisma.projectListItem.count({ where: { listId: id } })) >= LIMITS.items) {
      throw new ConflictException(`A project list can hold up to ${LIMITS.items} products — start another list for the next stage.`);
    }
    const data = {
      ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      ...(dto.stage ? { stage: dto.stage } : {}),
      ...(dto.note !== undefined ? { note: dto.note } : {}),
    };
    await this.prisma.$transaction([
      this.prisma.projectListItem.upsert({ where: { listId_sku_unit: { listId: id, sku: dto.sku, unit: dto.unit } }, update: data, create: { listId: id, sku: dto.sku, unit: dto.unit, ...data } }),
      this.prisma.projectList.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);
    return this.one(user, id);
  }

  async updateItem(user: AuthUser, id: string, itemId: string, dto: UpdateItemDto) {
    await this.own(user, id);
    const existing = await this.prisma.projectListItem.findFirst({ where: { id: itemId, listId: id }, select: { sku: true, unit: true, quantity: true } });
    if (!existing) throw new NotFoundException("That product isn't on this list.");
    const unit = dto.unit ?? existing.unit;
    const quantity = dto.quantity !== undefined ? dto.quantity : existing.quantity === null ? null : Number(existing.quantity);
    await this.checkProduct(existing.sku, unit, quantity);
    if (unit !== existing.unit && (await this.prisma.projectListItem.findUnique({ where: { listId_sku_unit: { listId: id, sku: existing.sku, unit } } }))) {
      throw new ConflictException("This product is already on the list in that unit.");
    }
    await this.prisma.$transaction([
      this.prisma.projectListItem.update({
        where: { id: itemId },
        data: { unit, quantity, ...(dto.stage ? { stage: dto.stage } : {}), ...(dto.note !== undefined ? { note: dto.note } : {}) },
      }),
      this.prisma.projectList.update({ where: { id }, data: { updatedAt: new Date() } }),
    ]);
    return this.one(user, id);
  }

  async removeItem(user: AuthUser, id: string, itemId: string) {
    await this.own(user, id);
    const { count } = await this.prisma.projectListItem.deleteMany({ where: { id: itemId, listId: id } });
    if (count === 0) throw new NotFoundException("That product isn't on this list.");
    await this.prisma.projectList.update({ where: { id }, data: { updatedAt: new Date() } });
    return this.one(user, id);
  }

  /** Turn the read-only share link on (a fresh token each time) or off. */
  async share(user: AuthUser, id: string, enabled: boolean) {
    await this.own(user, id);
    await this.prisma.projectList.update({ where: { id }, data: { shareToken: enabled ? randomBytes(18).toString("base64url") : null } });
    return this.one(user, id);
  }

  async duplicate(user: AuthUser, id: string) {
    const source = await this.one(user, id);
    return this.copy(user, source, `${source.name} (copy)`.slice(0, 80));
  }

  /** A shared list, read-only: no owner details and no share token. */
  async shared(token: string) {
    if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) throw new NotFoundException("This shared list doesn't exist or is no longer shared.");
    const found = await this.prisma.projectList.findUnique({
      where: { shareToken: token },
      select: { name: true, siteName: true, province: true, neededBy: true, notes: true, updatedAt: true, items: { orderBy: { createdAt: "asc" }, select: ITEM_FIELDS } },
    });
    if (!found) throw new NotFoundException("This shared list doesn't exist or is no longer shared.");
    return list(found);
  }

  /** Save someone's shared list into your own account. */
  async copyShared(user: AuthUser, token: string) {
    return this.copy(user, await this.shared(token), undefined);
  }

  private async copy(user: AuthUser, source: Awaited<ReturnType<ProjectListsService["shared"]>>, name: string | undefined) {
    if ((await this.prisma.projectList.count({ where: { userId: user.id } })) >= LIMITS.lists) {
      throw new ConflictException(`You can keep up to ${LIMITS.lists} project lists — delete one you've finished with.`);
    }
    const created = await this.prisma.projectList.create({
      data: {
        userId: user.id,
        name: name ?? source.name,
        siteName: source.siteName,
        province: source.province,
        neededBy: date(source.neededBy),
        notes: source.notes,
        items: { create: source.items.map((i) => ({ sku: i.sku, unit: i.unit, quantity: i.quantity, stage: i.stage, note: i.note })) },
      },
      select: { id: true },
    });
    return this.one(user, created.id);
  }

  private async own(user: AuthUser, id: string) {
    const found = await this.prisma.projectList.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!found) throw new NotFoundException("Project list not found.");
  }

  /** The product must be on sale in that unit; bags, lengths and other packaged units are whole numbers. */
  private async checkProduct(sku: string, unit: string, quantity: number | null | undefined) {
    if (!(UNITS as readonly string[]).includes(unit)) throw new BadRequestException(`"${unit}" isn't a unit we sell in.`);
    const product = await this.prisma.product.findUnique({ where: { sku }, select: { name: true, isActive: true, unitsOfSale: true } });
    if (!product || !product.isActive) throw new BadRequestException("That product isn't available.");
    if (!product.unitsOfSale.includes(unitOfSale(unit as never) as UnitOfSale)) throw new BadRequestException(`${product.name} isn't sold in that unit.`);
    if (quantity != null && WHOLE_UNITS(unit) && !Number.isInteger(quantity)) throw new BadRequestException(`${product.name} is sold in whole units.`);
  }
}
