import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { coordinateError, haversineKm, parseSupplierCsv, SERVICE_PROVINCES, suppliersToCsv, type CsvError } from "./supplier-csv";
import { SupplierDto } from "./suppliers.dto";

export type ImportSummary = { created: number; updated: number; unchanged: number; errors: CsvError[]; missingCoordinates: number };

/**
 * Supplier & Delivery-Point Locator (Module 6): the approved partner-supplier
 * network — a broker model with no owned yards. Staff manage the full
 * records. The public partner-network page shows names, towns and
 * categories (verified partners and researched leads labelled apart);
 * contact details are staff-only. Only active, verified partners count
 * as delivery points.
 */
@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Imports the supplier database CSV. All-or-nothing: any bad row rejects the file with every problem listed. */
  async importCsv(text: string): Promise<ImportSummary> {
    const { rows, errors } = parseSupplierCsv(text);
    if (errors.length > 0) return { created: 0, updated: 0, unchanged: 0, errors, missingCoordinates: 0 };

    const existing = new Set(
      (await this.prisma.supplierLocation.findMany({ where: { externalId: { in: rows.map((r) => r.externalId) } }, select: { externalId: true } })).map(
        (s) => s.externalId,
      ),
    );
    await this.prisma.$transaction(
      rows.map((row) => {
        const fromFile = {
          name: row.name,
          tier: row.tier,
          province: row.province,
          address: row.address,
          categorySlugs: row.categorySlugs,
          productNotes: row.productNotes,
          isVerifiedPartner: row.isVerifiedPartner,
          sourceUrl: row.sourceUrl,
          // Optional columns only overwrite when the file has them, so a re-import keeps staff edits.
          ...(row.explicitTown ? { city: row.city } : {}),
          ...(row.latitude !== undefined ? { latitude: row.latitude, longitude: row.longitude } : {}),
          ...(row.contactName !== undefined ? { contactName: row.contactName } : {}),
          ...(row.contactPhone !== undefined ? { contactPhone: row.contactPhone } : {}),
          ...(row.isActive !== undefined ? { isActive: row.isActive } : {}),
        };
        return this.prisma.supplierLocation.upsert({
          where: { externalId: row.externalId },
          update: fromFile,
          create: {
            ...fromFile,
            externalId: row.externalId,
            city: row.city,
            // Researched leads start inactive: they aren't delivery points until qualified.
            isActive: row.isActive ?? (row.isVerifiedPartner && SERVICE_PROVINCES.includes(row.province)),
          },
        });
      }),
    );
    const total = await this.prisma.supplierLocation.count();
    const created = rows.filter((r) => !existing.has(r.externalId)).length;
    return {
      created,
      updated: rows.length - created,
      unchanged: total - rows.length,
      errors: [],
      missingCoordinates: await this.prisma.supplierLocation.count({ where: { latitude: null } }),
    };
  }

  async exportCsv() {
    const suppliers = await this.prisma.supplierLocation.findMany({ orderBy: [{ externalId: "asc" }, { name: "asc" }] });
    return suppliersToCsv(suppliers);
  }

  list(province?: string, filter?: string) {
    return this.prisma.supplierLocation.findMany({
      where: {
        province,
        ...(filter === "missing-coordinates" ? { latitude: null } : {}),
        ...(filter === "inactive" ? { isActive: false } : {}),
        ...(filter === "active" ? { isActive: true } : {}),
        ...(filter === "leads" ? { isVerifiedPartner: false } : {}),
      },
      orderBy: [{ province: "asc" }, { tier: "asc" }, { name: "asc" }],
    });
  }

  async get(id: string) {
    const supplier = await this.prisma.supplierLocation.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException("Supplier not found.");
    return supplier;
  }

  create(dto: SupplierDto) {
    return this.save(null, dto);
  }

  update(id: string, dto: SupplierDto) {
    return this.save(id, dto);
  }

  async remove(id: string) {
    await this.get(id);
    await this.prisma.supplierLocation.delete({ where: { id } });
  }

  /**
   * Public: active delivery points per province — towns and categories, no
   * names or contacts. A province counts as delivering when it has an
   * active supplier.
   */
  async coverage() {
    const suppliers = await this.prisma.supplierLocation.findMany({
      where: { isActive: true, isVerifiedPartner: true },
      select: { province: true, city: true, categorySlugs: true, latitude: true },
    });
    const byProvince = new Map<string, { deliveryPoints: number; towns: Set<string>; categories: Set<string> }>();
    for (const s of suppliers) {
      const entry = byProvince.get(s.province) ?? { deliveryPoints: 0, towns: new Set(), categories: new Set() };
      entry.deliveryPoints += 1;
      entry.towns.add(s.city);
      s.categorySlugs.forEach((c) => entry.categories.add(c));
      byProvince.set(s.province, entry);
    }
    return {
      deliveryPoints: suppliers.length,
      withCoordinates: suppliers.filter((s) => s.latitude !== null).length,
      provinces: [...byProvince.entries()]
        .map(([province, e]) => ({ province, deliveryPoints: e.deliveryPoints, towns: [...e.towns].sort(), categories: [...e.categories].sort() }))
        .sort((a, b) => b.deliveryPoints - a.deliveryPoints),
    };
  }

  /**
   * Public: the partner network by province — names, towns, addresses and
   * categories, never contacts. Verified partners and researched leads are
   * returned separately so the storefront can label them honestly.
   */
  async network() {
    const suppliers = await this.prisma.supplierLocation.findMany({
      select: { externalId: true, name: true, province: true, city: true, address: true, categorySlugs: true, isVerifiedPartner: true, isActive: true, tier: true },
      orderBy: [{ province: "asc" }, { tier: "asc" }, { name: "asc" }],
    });
    return {
      partners: suppliers.filter((s) => s.isVerifiedPartner).map(({ isVerifiedPartner: _v, ...s }) => s),
      leads: suppliers.filter((s) => !s.isVerifiedPartner).map(({ isVerifiedPartner: _v, isActive: _a, tier: _t, ...s }) => s),
    };
  }

  /**
   * The nearest active delivery point that supplies the category, by
   * straight-line distance. Public callers get the town, province and
   * distance only.
   */
  async nearest(latitude: number, longitude: number, category?: string) {
    const candidates = await this.prisma.supplierLocation.findMany({
      where: {
        isActive: true,
        isVerifiedPartner: true,
        latitude: { not: null },
        longitude: { not: null },
        ...(category ? { categorySlugs: { has: category } } : {}),
      },
      select: { city: true, province: true, latitude: true, longitude: true },
    });
    let best: { city: string; province: string; distanceKm: number } | null = null;
    for (const c of candidates) {
      const distanceKm = haversineKm({ latitude, longitude }, { latitude: c.latitude!, longitude: c.longitude! });
      if (!best || distanceKm < best.distanceKm) best = { city: c.city, province: c.province, distanceKm };
    }
    if (!best) return { found: false as const };
    return { found: true as const, town: best.city, province: best.province, distanceKm: Math.round(best.distanceKm * 10) / 10 };
  }

  private async save(id: string | null, dto: SupplierDto) {
    const hasLat = dto.latitude !== undefined && dto.latitude !== null;
    const hasLng = dto.longitude !== undefined && dto.longitude !== null;
    if (hasLat !== hasLng) throw new BadRequestException("Give both latitude and longitude, or neither.");
    if (hasLat) {
      const problem = coordinateError(dto.latitude!, dto.longitude!);
      if (problem) throw new BadRequestException(`Coordinates look wrong: ${problem}.`);
    }
    // Optional fields left out of the request stay as they are — in particular
    // externalId, which links the record to the supplier database for re-imports.
    const optional = (value: string | undefined) => (value === undefined ? undefined : value.trim() || null);
    const data = {
      externalId: optional(dto.externalId),
      name: dto.name.trim(),
      tier: dto.tier,
      province: dto.province,
      city: dto.city.trim(),
      address: optional(dto.address),
      ...(dto.latitude !== undefined || dto.longitude !== undefined
        ? { latitude: hasLat ? dto.latitude! : null, longitude: hasLng ? dto.longitude! : null }
        : {}),
      categorySlugs: [...new Set(dto.categorySlugs)],
      productNotes: optional(dto.productNotes),
      contactName: optional(dto.contactName),
      contactPhone: optional(dto.contactPhone),
      isActive: dto.isActive,
      isVerifiedPartner: dto.isVerifiedPartner,
      sourceUrl: optional(dto.sourceUrl),
    };
    try {
      return id
        ? await this.prisma.supplierLocation.update({ where: { id }, data })
        : await this.prisma.supplierLocation.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new BadRequestException(`Another supplier already uses the ID ${data.externalId}.`);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundException("Supplier not found.");
      }
      throw error;
    }
  }
}
