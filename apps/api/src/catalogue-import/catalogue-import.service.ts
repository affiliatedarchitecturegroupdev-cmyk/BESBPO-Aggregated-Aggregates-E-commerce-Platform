import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CatalogueImportStatus, Prisma } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { UNIT_LABEL } from "../common/format";
import { PrismaService } from "../common/prisma.service";
import { pricingUnit } from "../pricing/units";
import type { PriceRow } from "../supplier-prices/price-list";
import { SupplierPricesService } from "../supplier-prices/supplier-prices.service";
import { checkRows, importRows, makeSku, makeSlug, type ImportRow } from "./catalogue-import";

type Upload = { buffer: Buffer; size: number; originalname?: string } | undefined;

/** What the storefront reads for a product staff added — the same fields the catalogue files give it. */
export type AddedProduct = {
  sku: string;
  slug: string;
  name: string;
  categorySlug: string;
  brand: string | null;
  gradingStandard: string | null;
  unitSize: string | null;
  description: string | null;
  units: { unit: string; label: string }[];
  addedAt: string;
};

const PUBLIC_CACHE_MS = 60_000;

/**
 * Catalogue import (ROADMAP 2.6, docs/catalogue-import.md). Staff upload a CSV or Excel file of products; every
 * row is checked and shown as a preview, and nothing changes until staff add the new products. Added products
 * live in the database (Product.catalogueImportId) and are quote-only until a supplier price is approved — the
 * storefront and the pricing service read them from here. With a supplier chosen, its codes are learned (so its
 * next price list matches) and any costs become one of its price lists, approved as usual.
 */
@Injectable()
export class CatalogueImportService {
  private publicCache: { at: number; value: AddedProduct[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly supplierPrices: SupplierPricesService,
  ) {}

  /** Reads and checks the file; stored as a preview. */
  async preview(file: Upload, meta: { supplierLocationId?: string | null; validUntil?: string | null }, user: AuthUser) {
    const { rows, fileName } = this.supplierPrices.read(file, "product list");
    const parsed = importRows(rows);
    if (parsed.problem) throw new BadRequestException(parsed.problem);
    const supplier = meta.supplierLocationId ? await this.prisma.supplierLocation.findUnique({ where: { id: meta.supplierLocationId }, select: { id: true, name: true } }) : null;
    if (meta.supplierLocationId && !supplier) throw new NotFoundException("Supplier not found.");
    const validUntil = this.supplierPrices.validUntil(meta.validUntil);
    const checked = await this.check(parsed.rows);
    const created = await this.prisma.catalogueImport.create({
      data: { fileName, supplierLocationId: supplier?.id ?? null, supplierName: supplier?.name ?? null, validUntil, rows: checked as unknown as Prisma.InputJsonValue, createdById: user.id },
    });
    return this.get(created.id);
  }

  private async check(raw: ReturnType<typeof importRows>["rows"]) {
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({ select: { slug: true, name: true, catalogueGroup: true } }),
      this.prisma.product.findMany({ select: { sku: true, slug: true, name: true, category: { select: { slug: true } } } }),
    ]);
    return checkRows(
      raw,
      categories,
      products.map((p) => ({ sku: p.sku, slug: p.slug, name: p.name, categorySlug: p.category.slug })),
      new Set(products.map((p) => p.sku)),
      new Set(products.map((p) => p.slug)),
    );
  }

  /**
   * Adds the preview's new products, learns the supplier's codes and sends any costs to its price list for
   * approval. Rows with a problem are left out. An SKU or slug taken since the preview gets a fresh one.
   */
  async apply(id: string, user: AuthUser) {
    const run = await this.prisma.catalogueImport.findUnique({ where: { id } });
    if (!run) throw new NotFoundException("Import not found.");
    if (run.status !== CatalogueImportStatus.PREVIEW) throw new BadRequestException("This import has already been added or discarded.");
    const rows = run.rows as unknown as ImportRow[];
    const fresh = rows.filter((r) => r.status === "NEW");
    if (fresh.length === 0 && !rows.some((r) => r.status === "EXISTS" && r.supplierCode && run.supplierLocationId)) {
      throw new BadRequestException("There's nothing new to add from this file.");
    }

    const [categories, taken] = await Promise.all([
      this.prisma.category.findMany({ where: { slug: { in: [...new Set(fresh.map((r) => r.categorySlug!))] } }, select: { id: true, slug: true } }),
      this.prisma.product.findMany({ select: { sku: true, slug: true } }),
    ]);
    const categoryId = new Map(categories.map((c) => [c.slug, c.id]));
    const skus = new Set(taken.map((p) => p.sku));
    const slugs = new Set(taken.map((p) => p.slug));
    for (const r of fresh) {
      if (skus.has(r.sku!)) r.sku = makeSku(r.name, r.categorySlug!, skus);
      else skus.add(r.sku!);
      if (slugs.has(r.slug!)) r.slug = makeSlug(r.name, slugs);
      else slugs.add(r.slug!);
    }

    await this.prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < fresh.length; i += 500) {
          await tx.product.createMany({
            data: fresh.slice(i, i + 500).map((r) => ({
              sku: r.sku!,
              slug: r.slug!,
              name: r.name,
              categoryId: categoryId.get(r.categorySlug!)!,
              unitsOfSale: r.units,
              brand: r.brand,
              gradingStandard: r.standard,
              unitSize: r.size,
              description: r.description,
              catalogueImportId: run.id,
            })),
          });
        }
        if (run.supplierLocationId) {
          for (const r of rows) {
            if (r.status === "PROBLEM" || !r.supplierCode) continue;
            await tx.supplierProductCode.upsert({
              where: { supplierLocationId_supplierCode: { supplierLocationId: run.supplierLocationId, supplierCode: r.supplierCode } },
              update: { sku: r.sku! },
              create: { supplierLocationId: run.supplierLocationId, supplierCode: r.supplierCode, sku: r.sku! },
            });
          }
        }
        await tx.catalogueImport.update({
          where: { id: run.id },
          data: { status: CatalogueImportStatus.APPLIED, appliedAt: new Date(), appliedById: user.id, rows: rows as unknown as Prisma.InputJsonValue },
        });
      },
      { timeout: 60_000 },
    );
    this.publicCache = null;

    // The costs: one of the supplier's price lists, matched on the SKUs just added. Nothing is priced until approved.
    const costs: PriceRow[] = run.supplierLocationId
      ? rows
          .filter((r) => r.status !== "PROBLEM" && r.cost !== null)
          .map((r) => ({ rowNumber: r.rowNumber, sku: r.sku, supplierCode: r.supplierCode, description: r.name, unit: pricingUnit(r.units[0]), cost: r.cost, problem: null }))
      : [];
    if (costs.length) {
      const priceListId = await this.supplierPrices.fromCatalogueImport({
        supplierLocationId: run.supplierLocationId!,
        supplierName: run.supplierName ?? "Supplier",
        fileName: run.fileName,
        validUntil: run.validUntil && run.validUntil > new Date() ? run.validUntil : null,
        rows: costs,
        userId: user.id,
      });
      await this.prisma.catalogueImport.update({ where: { id: run.id }, data: { priceListId } });
    }
    return this.get(run.id);
  }

  async discard(id: string) {
    const run = await this.prisma.catalogueImport.findUnique({ where: { id }, select: { status: true } });
    if (!run) throw new NotFoundException("Import not found.");
    if (run.status !== CatalogueImportStatus.PREVIEW) throw new BadRequestException("Only a preview can be discarded — products already added are hidden from Admin → Products.");
    await this.prisma.catalogueImport.update({ where: { id }, data: { status: CatalogueImportStatus.DISCARDED } });
    return this.get(id);
  }

  async list() {
    const runs = await this.prisma.catalogueImport.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    return runs.map((r) => ({ ...this.summary(r), rows: undefined }));
  }

  async get(id: string) {
    const run = await this.prisma.catalogueImport.findUnique({ where: { id } });
    if (!run) throw new NotFoundException("Import not found.");
    return this.summary(run);
  }

  private summary(run: Prisma.CatalogueImportGetPayload<object>) {
    const rows = run.rows as unknown as ImportRow[];
    const count = (s: ImportRow["status"]) => rows.filter((r) => r.status === s).length;
    return {
      id: run.id,
      status: run.status,
      fileName: run.fileName,
      supplierLocationId: run.supplierLocationId,
      supplierName: run.supplierName,
      validUntil: run.validUntil,
      createdAt: run.createdAt,
      appliedAt: run.appliedAt,
      priceListId: run.priceListId,
      counts: { NEW: count("NEW"), EXISTS: count("EXISTS"), PROBLEM: count("PROBLEM"), withCost: rows.filter((r) => r.status !== "PROBLEM" && r.cost !== null).length },
      rows: rows.map((r) => ({ ...r, unitLabels: r.units.map((u) => UNIT_LABEL[u]) })),
    };
  }

  /** Public: every active product staff added, for the storefront. Cached for a minute; adding products refreshes it. */
  async added(): Promise<AddedProduct[]> {
    if (this.publicCache && Date.now() - this.publicCache.at < PUBLIC_CACHE_MS) return this.publicCache.value;
    const value = await this.addedProducts(true);
    this.publicCache = { at: Date.now(), value };
    return value;
  }

  /** Staff: every product added by import, hidden ones too, so Admin → Products can show them again. */
  staffProducts() {
    return this.addedProducts(false);
  }

  private async addedProducts(activeOnly: boolean): Promise<(AddedProduct & { isActive: boolean })[]> {
    const products = await this.prisma.product.findMany({
      where: { catalogueImportId: { not: null }, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { createdAt: "asc" },
      select: { sku: true, slug: true, name: true, brand: true, gradingStandard: true, unitSize: true, description: true, unitsOfSale: true, createdAt: true, isActive: true, category: { select: { slug: true } } },
    });
    return products.map((p) => ({
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      categorySlug: p.category.slug,
      brand: p.brand,
      gradingStandard: p.gradingStandard,
      unitSize: p.unitSize,
      description: p.description,
      units: p.unitsOfSale.map((u) => ({ unit: pricingUnit(u), label: UNIT_LABEL[u] })),
      addedAt: p.createdAt.toISOString(),
      ...(activeOnly ? {} : { isActive: p.isActive }),
    })) as (AddedProduct & { isActive: boolean })[];
  }
}
