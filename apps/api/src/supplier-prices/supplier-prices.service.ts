import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PriceLineStatus, PriceListSource, type UnitOfSale } from "@aggregates/database";
import type { AuthUser } from "../common/auth/auth-user";
import { UNIT_LABEL } from "../common/format";
import { PrismaService } from "../common/prisma.service";
import { linkedSupplierId } from "../deliveries/access";
import { priceListUploadedEmail } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";
import { csvRows } from "../boq/boq";
import { readFirstSheet } from "../boq/xlsx";
import { detectScheduleFileType } from "../cut-and-bend/bar-schedule";
import { PricingService, type CustomerTierName, type PricedLine, type PricingUnit } from "../pricing/pricing.service";
import { pricingUnit } from "../pricing/units";
import { markupOf, matchUnit, minimumPrice, nameKey, priceRows, suggestPrice, type PriceRow, type UnitOption } from "./price-list";

export const MAX_PRICE_LIST_BYTES = 5 * 1024 * 1024;
const FALLBACK_MARKUP_PERCENT = 8;
const CHUNK = 250;
/** Aggregates and ready-mix are priced per ton / m³ from their own price bands, not from supplier lists (yet). */
const BAND_FAMILIES = new Set(["AGGREGATE", "READY_MIX"]);
const TIERS: CustomerTierName[] = ["RETAIL", "CONTRACTOR_TRADE", "VOLUME_CIVIL_BULK"];

type Upload = { buffer: Buffer; size: number; originalname?: string } | undefined;
type CatalogueProduct = { sku: string; name: string; units: UnitOption[] };
type Candidate = { row: PriceRow; sku: string | null; unit: string | null; problem: string | null };

export type LiveTierPrices = { sku: string; unit: string; prices: Record<CustomerTierName, number | null> };

/**
 * Supplier price lists (ROADMAP Phase 1, docs/supplier-prices.md).
 *
 * Staff upload a supplier's list (CSV or Excel). Each row is matched to a product and unit, and the suggested
 * sell price is the supplier's cost plus the product's standard markup — the same rule as sales quotations.
 * Nothing goes live until staff approve it. An approved price stands in for the catalogue's list price
 * everywhere — product pages, the cart, checkout, quotes — with tier discounts and the margin floor as usual,
 * until the list's valid-until date, when the product goes back to its catalogue price (quote-only for most).
 * Supplier costs and suppliers never leave staff screens; the storefront sees sell prices only.
 */
@Injectable()
export class SupplierPricesService {
  private readonly logger = new Logger(SupplierPricesService.name);
  private publicCache: { at: number; value: LiveTierPrices[] } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Upload and matching ---------------------------------------------------------------------------------

  /** Reads a supplier's price list and matches every row; nothing is priced until staff approve it. */
  async upload(file: Upload, meta: { supplierLocationId?: string | null; supplierName?: string | null; validUntil?: string | null; notes?: string | null }, user: AuthUser) {
    const { rows, fileName } = this.read(file);
    const parsed = priceRows(rows);
    if (parsed.problem) throw new BadRequestException(parsed.problem);
    const supplier = meta.supplierLocationId ? await this.prisma.supplierLocation.findUnique({ where: { id: meta.supplierLocationId }, select: { id: true, name: true } }) : null;
    if (meta.supplierLocationId && !supplier) throw new NotFoundException("Supplier not found.");
    const supplierName = supplier?.name ?? meta.supplierName?.trim();
    if (!supplierName) throw new BadRequestException("Choose the supplier, or type its name.");
    const validUntil = this.validUntil(meta.validUntil);

    const list = await this.prisma.supplierPriceList.create({
      data: { source: PriceListSource.SUPPLIER_LIST, supplierLocationId: supplier?.id ?? null, supplierName: supplierName.slice(0, 120), fileName, validUntil, notes: meta.notes?.trim().slice(0, 1000) || null, uploadedById: user.id },
    });
    await this.addLines(list.id, parsed.rows, supplier?.id ?? null);
    return this.list(list.id);
  }

  /**
   * Supplier costs staff typed into a sales quotation become suggestions too (one list per day), so the
   * quotations they send price the catalogue as a side effect. Never blocks sending the quotation.
   */
  async fromQuotation(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      select: { id: true, quoteNumber: true, validUntil: true, lineItems: { where: { priceSource: "SUPPLIER_COST", unitCost: { not: null } }, select: { unitOfSale: true, unitCost: true, note: true, product: { select: { sku: true, name: true } } } } },
    });
    if (!quote || quote.lineItems.length === 0) return;
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Johannesburg" });
    const name = `Costs from sales quotations, ${today}`;
    const list =
      (await this.prisma.supplierPriceList.findFirst({ where: { source: PriceListSource.QUOTATION, supplierName: name } })) ??
      (await this.prisma.supplierPriceList.create({
        data: { source: PriceListSource.QUOTATION, supplierName: name, validUntil: quote.validUntil, notes: "Supplier costs typed into sales quotations. Each price holds until the quotation's valid-until date." },
      }));
    const existing = await this.prisma.supplierPriceLine.findMany({ where: { priceListId: list.id }, select: { sku: true, unit: true, unitCost: true } });
    const seen = new Set(existing.map((l) => `${l.sku}|${l.unit}|${Number(l.unitCost)}`));
    const rows: PriceRow[] = [];
    for (const item of quote.lineItems) {
      const unit = pricingUnit(item.unitOfSale);
      const cost = Number(item.unitCost);
      if (seen.has(`${item.product.sku}|${unit}|${cost}`)) continue;
      seen.add(`${item.product.sku}|${unit}|${cost}`);
      rows.push({ rowNumber: existing.length + rows.length + 1, sku: item.product.sku, supplierCode: null, description: `${item.product.name} (quotation ${quote.quoteNumber ?? "draft"})`, unit, cost, problem: null });
    }
    if (rows.length) await this.addLines(list.id, rows, null, quote.id);
  }

  /**
   * Costs given with a catalogue import (docs/catalogue-import.md) become one of the supplier's price lists, matched
   * and suggested exactly like an upload — nothing is priced until staff approve it. Returns the list's id.
   */
  async fromCatalogueImport(input: { supplierLocationId: string; supplierName: string; fileName: string; validUntil: Date | null; rows: PriceRow[]; userId: string }) {
    const list = await this.prisma.supplierPriceList.create({
      data: {
        source: PriceListSource.SUPPLIER_LIST,
        supplierLocationId: input.supplierLocationId,
        supplierName: input.supplierName.slice(0, 120),
        fileName: input.fileName,
        validUntil: input.validUntil,
        notes: "Costs given with a catalogue import — the products were added from the same file.",
        uploadedById: input.userId,
      },
    });
    await this.addLines(list.id, input.rows, input.supplierLocationId);
    return list.id;
  }

  private async addLines(priceListId: string, rows: PriceRow[], supplierLocationId: string | null, quoteId: string | null = null) {
    const catalogue = await this.catalogue();
    const codes = supplierLocationId
      ? new Map((await this.prisma.supplierProductCode.findMany({ where: { supplierLocationId } })).map((c) => [c.supplierCode.toLowerCase(), c.sku]))
      : new Map<string, string>();

    const candidates: Candidate[] = rows.map((row) => {
      if (row.problem) return { row, sku: null, unit: null, problem: row.problem };
      const product =
        (row.sku && catalogue.bySku.get(row.sku)) ||
        (row.supplierCode && catalogue.bySku.get(codes.get(row.supplierCode.toLowerCase()) ?? "")) ||
        catalogue.byName.get(nameKey(row.description)) ||
        null;
      if (!product) return { row, sku: null, unit: null, problem: row.sku ? `No product with SKU ${row.sku}.` : "No product matched — choose one." };
      const unit = matchUnit(row.unit, product.units);
      if (!unit) return { row, sku: product.sku, unit: null, problem: `Which unit? ${product.name} is sold ${product.units.map((u) => u.label.replace(/^× /, "per ")).join(", ")}.` };
      return { row, sku: product.sku, unit, problem: null };
    });

    const reference = await this.reference(candidates.filter((c) => c.sku && c.unit).map((c) => ({ sku: c.sku!, unit: c.unit! })));
    const data = candidates.map((c) => {
      const ref = c.sku && c.unit ? reference.get(`${c.sku}|${c.unit}`) : undefined;
      const bandPriced = ref && BAND_FAMILIES.has(ref.family ?? "");
      const problem = c.problem ?? (bandPriced ? "Aggregates and ready-mix are priced per ton or m³ from their own price bands — change those in the catalogue." : null);
      const markup = ref?.markup ?? FALLBACK_MARKUP_PERCENT;
      const cost = c.row.cost ?? 0;
      const suggested = !problem && cost > 0 ? Math.max(suggestPrice(cost, markup), minimumPrice(cost)) : null;
      return {
        priceListId,
        rowNumber: c.row.rowNumber,
        supplierCode: c.row.supplierCode,
        description: c.row.description || c.sku || "—",
        sku: c.sku,
        unit: c.unit,
        unitCost: cost,
        currentPrice: ref?.current ?? null,
        markupPercent: problem ? null : markup,
        suggestedPrice: suggested,
        status: problem ? PriceLineStatus.UNMATCHED : PriceLineStatus.PENDING,
        problem,
        quoteId,
      };
    });
    for (let i = 0; i < data.length; i += 1000) await this.prisma.supplierPriceLine.createMany({ data: data.slice(i, i + 1000) });
  }

  /** Every active product with its units, by SKU and by (unique) name. */
  private async catalogue() {
    const products = await this.prisma.product.findMany({ where: { isActive: true }, select: { sku: true, name: true, unitsOfSale: true } });
    const bySku = new Map<string, CatalogueProduct>();
    const names = new Map<string, CatalogueProduct[]>();
    for (const p of products) {
      const product = { sku: p.sku, name: p.name, units: p.unitsOfSale.map((u: UnitOfSale) => ({ unit: pricingUnit(u), label: UNIT_LABEL[u] })) };
      bySku.set(p.sku, product);
      const key = nameKey(p.name);
      names.set(key, [...(names.get(key) ?? []), product]);
    }
    // A name shared by two products can't decide between them.
    const byName = new Map([...names].filter(([, list]) => list.length === 1).map(([k, list]) => [k, list[0]]));
    return { bySku, byName, products };
  }

  /** Each (SKU, unit)'s standard markup, family and what customers pay today — from the pricing service. */
  private async reference(pairs: { sku: string; unit: string }[]) {
    const out = new Map<string, { markup: number | null; family: string | null; current: number | null }>();
    const unique = [...new Map(pairs.map((p) => [`${p.sku}|${p.unit}`, p])).values()];
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const [catalogue, live] = await Promise.all([this.priceLines(chunk, "RETAIL", false), this.priceLines(chunk, "RETAIL", true)]);
      chunk.forEach((p, j) => {
        out.set(`${p.sku}|${p.unit}`, { markup: catalogue[j]?.markup_percent ?? null, family: catalogue[j]?.family ?? null, current: live[j]?.unit_price ?? null });
      });
    }
    return out;
  }

  /** Prices one of each (SKU, unit) at a tier; a chunk the pricing service refuses is priced line by line. */
  private async priceLines(pairs: { sku: string; unit: string }[], tier: CustomerTierName, live: boolean): Promise<(PricedLine | null)[]> {
    const request = (lines: { sku: string; unit: string }[]) =>
      this.pricing.calculateOrder({ lines: lines.map((l) => ({ sku: l.sku, unit: l.unit as PricingUnit, quantity: 1 })), distanceKm: 0, customerTier: tier }, { live });
    try {
      return (await request(pairs)).lines;
    } catch {
      return Promise.all(pairs.map((p) => request([p]).then((r) => r.lines[0] ?? null, () => null)));
    }
  }

  // --- Supplier self-service (ROADMAP 1.5) ----------------------------------------------------------------------

  /**
   * A supplier uploads its own price list in the supplier portal. It's matched exactly like a list staff upload,
   * and staff are emailed; nothing changes on the store until staff approve each price. A valid-until date is
   * required, so a supplier's prices always lapse rather than go stale.
   */
  async supplierUpload(file: Upload, meta: { validUntil?: string | null; notes?: string | null }, user: AuthUser) {
    const supplierId = await this.requireSupplier(user);
    if (!meta.validUntil) throw new BadRequestException("Say until when these prices hold — they stop applying after that date.");
    const validUntil = this.validUntil(meta.validUntil)!;
    if (validUntil.getTime() > Date.now() + 366 * 86_400_000) throw new BadRequestException("Prices can be valid for up to a year — upload a new list after that.");
    const { rows, fileName } = this.read(file);
    const parsed = priceRows(rows);
    if (parsed.problem) throw new BadRequestException(parsed.problem);
    const supplier = await this.prisma.supplierLocation.findUniqueOrThrow({ where: { id: supplierId }, select: { id: true, name: true } });
    const list = await this.prisma.supplierPriceList.create({
      data: { source: PriceListSource.SUPPLIER_PORTAL, supplierLocationId: supplier.id, supplierName: supplier.name, fileName, validUntil, notes: meta.notes?.trim().slice(0, 1000) || null, uploadedById: user.id },
    });
    await this.addLines(list.id, parsed.rows, supplier.id);
    const counts = await this.prisma.supplierPriceLine.groupBy({ by: ["status"], where: { priceListId: list.id }, _count: { _all: true } });
    const n = (s: PriceLineStatus) => counts.find((c) => c.status === s)?._count._all ?? 0;
    await this.notifications.staffAlert(
      "PRICE_LIST_UPLOADED",
      priceListUploadedEmail({ supplierName: supplier.name, rows: parsed.rows.length, waiting: n(PriceLineStatus.PENDING), unmatched: n(PriceLineStatus.UNMATCHED), validUntil, listId: list.id }),
    );
    return this.supplierList(list.id, user);
  }

  /** The supplier's own price lists, newest first, with how far our team has got with each. */
  async supplierLists(user: AuthUser) {
    const supplierId = await this.requireSupplier(user);
    const lists = await this.prisma.supplierPriceList.findMany({
      where: { supplierLocationId: supplierId, source: PriceListSource.SUPPLIER_PORTAL },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, fileName: true, validUntil: true, notes: true, createdAt: true },
    });
    const counts = await this.prisma.supplierPriceLine.groupBy({ by: ["priceListId", "status"], where: { priceListId: { in: lists.map((l) => l.id) } }, _count: { _all: true } });
    return lists.map((l) => ({ ...l, counts: Object.fromEntries(Object.values(PriceLineStatus).map((s) => [s, counts.find((c) => c.priceListId === l.id && c.status === s)?._count._all ?? 0])) as Record<PriceLineStatus, number> }));
  }

  /**
   * One of the supplier's lists, row by row: its own code, description, unit and cost, the product we matched
   * and where it stands. Never our sell price, markup or other suppliers' prices.
   */
  async supplierList(id: string, user: AuthUser) {
    const supplierId = await this.requireSupplier(user);
    const list = await this.prisma.supplierPriceList.findFirst({
      where: { id, supplierLocationId: supplierId, source: PriceListSource.SUPPLIER_PORTAL },
      select: {
        id: true,
        fileName: true,
        validUntil: true,
        notes: true,
        createdAt: true,
        lines: { orderBy: { rowNumber: "asc" }, select: { id: true, rowNumber: true, supplierCode: true, description: true, sku: true, unit: true, unitCost: true, status: true, problem: true } },
      },
    });
    if (!list) throw new NotFoundException("Price list not found.");
    const names = new Map((await this.prisma.product.findMany({ where: { sku: { in: list.lines.flatMap((l) => (l.sku ? [l.sku] : [])) } }, select: { sku: true, name: true } })).map((p) => [p.sku, p.name]));
    return { ...list, lines: list.lines.map((l) => ({ ...l, productName: l.sku ? (names.get(l.sku) ?? null) : null })) };
  }

  private async requireSupplier(user: AuthUser) {
    const supplierId = await linkedSupplierId(this.prisma, user);
    if (!supplierId) throw new NotFoundException("This login isn't linked to an active supplier.");
    return supplierId;
  }

  // --- Review ------------------------------------------------------------------------------------------------

  async lists() {
    const lists = await this.prisma.supplierPriceList.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { supplierLocation: { select: { name: true, province: true } } } });
    const counts = await this.prisma.supplierPriceLine.groupBy({ by: ["priceListId", "status"], where: { priceListId: { in: lists.map((l) => l.id) } }, _count: { _all: true } });
    return lists.map((l) => ({
      ...l,
      counts: Object.fromEntries(Object.values(PriceLineStatus).map((s) => [s, counts.find((c) => c.priceListId === l.id && c.status === s)?._count._all ?? 0])) as Record<PriceLineStatus, number>,
    }));
  }

  async list(id: string) {
    const list = await this.prisma.supplierPriceList.findUnique({
      where: { id },
      include: { supplierLocation: { select: { name: true, province: true } }, lines: { orderBy: { rowNumber: "asc" } } },
    });
    if (!list) throw new NotFoundException("Price list not found.");
    const names = new Map((await this.prisma.product.findMany({ where: { sku: { in: list.lines.flatMap((l) => (l.sku ? [l.sku] : [])) } }, select: { sku: true, name: true, slug: true } })).map((p) => [p.sku, p]));
    return { ...list, lines: list.lines.map((l) => ({ ...l, product: l.sku ? (names.get(l.sku) ?? null) : null })) };
  }

  /** Staff point an unmatched row at the right product and unit; it's re-priced and waits for approval. */
  async mapLine(id: string, change: { sku: string; unit?: string | null }) {
    const line = await this.prisma.supplierPriceLine.findUnique({ where: { id } });
    if (!line) throw new NotFoundException("Line not found.");
    if (line.status === PriceLineStatus.APPROVED) throw new BadRequestException("This line is already live — withdraw the price first.");
    if (Number(line.unitCost) <= 0) throw new BadRequestException("This row has no cost to price from.");
    const { bySku } = await this.catalogue();
    const product = bySku.get(change.sku.trim().toUpperCase());
    if (!product) throw new NotFoundException(`No product with SKU ${change.sku}.`);
    const unit = matchUnit(change.unit ?? null, product.units);
    if (!unit) throw new BadRequestException(`Choose the unit: ${product.name} is sold ${product.units.map((u) => u.unit).join(", ")}.`);
    const ref = (await this.reference([{ sku: product.sku, unit }])).get(`${product.sku}|${unit}`);
    if (ref && BAND_FAMILIES.has(ref.family ?? "")) throw new BadRequestException("Aggregates and ready-mix are priced per ton or m³ from their own price bands.");
    const cost = Number(line.unitCost);
    const markup = ref?.markup ?? FALLBACK_MARKUP_PERCENT;
    return this.prisma.supplierPriceLine.update({
      where: { id },
      data: { sku: product.sku, unit, markupPercent: markup, suggestedPrice: Math.max(suggestPrice(cost, markup), minimumPrice(cost)), currentPrice: ref?.current ?? null, status: PriceLineStatus.PENDING, problem: null },
    });
  }

  /** Approves a line at the suggested price (or the price staff set): it goes live straight away. */
  async approveLine(id: string, user: AuthUser, price?: number | null) {
    const line = await this.prisma.supplierPriceLine.findUnique({ where: { id }, include: { priceList: true } });
    if (!line) throw new NotFoundException("Line not found.");
    if (line.status === PriceLineStatus.APPROVED) throw new BadRequestException("This price is already live.");
    if (!line.sku || !line.unit || line.status === PriceLineStatus.UNMATCHED) throw new BadRequestException("Match this row to a product and unit first.");
    const cost = Number(line.unitCost);
    const sell = price ?? (line.suggestedPrice !== null ? Number(line.suggestedPrice) : null);
    if (sell === null || !(sell > 0)) throw new BadRequestException("Set the sell price.");
    if (sell < minimumPrice(cost)) throw new BadRequestException(`R${sell.toFixed(2)} is below the cost plus the 3% minimum margin (R${minimumPrice(cost).toFixed(2)}).`);
    if (line.priceList.validUntil && line.priceList.validUntil <= new Date()) throw new BadRequestException("This price list has expired — upload the supplier's current list.");

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.productPrice.updateMany({ where: { sku: line.sku!, unit: line.unit!, isActive: true }, data: { isActive: false, endedAt: now } });
      await tx.productPrice.create({
        data: {
          sku: line.sku!,
          unit: line.unit!,
          listPrice: sell,
          unitCost: cost,
          markupPercent: markupOf(sell, cost),
          source: line.priceList.source,
          priceLineId: line.id,
          supplierLocationId: line.priceList.supplierLocationId,
          supplierName: line.priceList.supplierName,
          validUntil: line.priceList.validUntil,
          approvedById: user.id,
        },
      });
      await tx.supplierPriceLine.update({ where: { id }, data: { status: PriceLineStatus.APPROVED, approvedPrice: sell, decidedById: user.id, decidedAt: now } });
      // The supplier's code for this product, for its next list (ROADMAP 1.3).
      if (line.supplierCode && line.priceList.supplierLocationId) {
        await tx.supplierProductCode.upsert({
          where: { supplierLocationId_supplierCode: { supplierLocationId: line.priceList.supplierLocationId, supplierCode: line.supplierCode } },
          update: { sku: line.sku! },
          create: { supplierLocationId: line.priceList.supplierLocationId, supplierCode: line.supplierCode, sku: line.sku! },
        });
      }
    });
    this.publicCache = null;
    return this.prisma.supplierPriceLine.findUnique({ where: { id } });
  }

  async rejectLine(id: string, user: AuthUser) {
    const line = await this.prisma.supplierPriceLine.findUnique({ where: { id } });
    if (!line) throw new NotFoundException("Line not found.");
    if (line.status === PriceLineStatus.APPROVED) throw new BadRequestException("This price is live — withdraw it instead.");
    return this.prisma.supplierPriceLine.update({ where: { id }, data: { status: PriceLineStatus.REJECTED, decidedById: user.id, decidedAt: new Date() } });
  }

  /** Approves every matched, waiting line at its suggested price. */
  async approveAll(listId: string, user: AuthUser) {
    const lines = await this.prisma.supplierPriceLine.findMany({ where: { priceListId: listId, status: PriceLineStatus.PENDING, suggestedPrice: { not: null } }, select: { id: true } });
    let approved = 0;
    const problems: string[] = [];
    for (const l of lines) {
      try {
        await this.approveLine(l.id, user);
        approved++;
      } catch (error) {
        problems.push((error as Error).message);
      }
    }
    return { approved, problems: [...new Set(problems)].slice(0, 5) };
  }

  // --- Live prices ---------------------------------------------------------------------------------------------

  /** Staff: the live supplier prices, soonest to expire first, with cost and markup. */
  async live(filter: { sku?: string } = {}) {
    const now = new Date();
    const rows = await this.prisma.productPrice.findMany({
      where: { isActive: true, OR: [{ validUntil: null }, { validUntil: { gt: now } }], ...(filter.sku ? { sku: filter.sku } : {}) },
      orderBy: [{ validUntil: { sort: "asc", nulls: "last" } }, { approvedAt: "desc" }],
      take: 1000,
    });
    const names = new Map((await this.prisma.product.findMany({ where: { sku: { in: rows.map((r) => r.sku) } }, select: { sku: true, name: true, slug: true } })).map((p) => [p.sku, p]));
    return rows.map((r) => ({ ...r, product: names.get(r.sku) ?? null }));
  }

  /** Staff: every price a SKU has had from supplier lists, newest first. */
  history(sku: string) {
    return this.prisma.productPrice.findMany({ where: { sku }, orderBy: { approvedAt: "desc" }, take: 100 });
  }

  /** Staff take a live price down; the product goes back to its catalogue price (quote-only for most). */
  async withdraw(id: string) {
    const updated = await this.prisma.productPrice.updateMany({ where: { id, isActive: true }, data: { isActive: false, endedAt: new Date() } });
    if (updated.count === 0) throw new NotFoundException("No live price with that id.");
    this.publicCache = null;
  }

  /** How many products and units are priced from supplier lists, and how many expire in the next 7 days. */
  async coverage() {
    const now = new Date();
    const soon = new Date(now.getTime() + 7 * 86_400_000);
    const live = await this.prisma.productPrice.findMany({ where: { isActive: true, OR: [{ validUntil: null }, { validUntil: { gt: now } }] }, select: { sku: true, validUntil: true } });
    const [pending, unmatched] = await Promise.all([
      this.prisma.supplierPriceLine.count({ where: { status: PriceLineStatus.PENDING } }),
      this.prisma.supplierPriceLine.count({ where: { status: PriceLineStatus.UNMATCHED } }),
    ]);
    return {
      livePrices: live.length,
      liveSkus: new Set(live.map((l) => l.sku)).size,
      expiringIn7Days: live.filter((l) => l.validUntil && l.validUntil <= soon).length,
      pending,
      unmatched,
    };
  }

  /**
   * Public: every live supplier price as the storefront shows it — the price at each tier (null where that
   * tier is quoted), worked out by the pricing service so it matches checkout. Never costs or suppliers.
   * Cached for a minute; approving or withdrawing a price clears it.
   */
  async publicPrices(): Promise<LiveTierPrices[]> {
    if (this.publicCache && Date.now() - this.publicCache.at < 60_000) return this.publicCache.value;
    const live = await this.pricing.livePrices();
    const out: LiveTierPrices[] = [];
    for (let i = 0; i < live.length; i += CHUNK) {
      const chunk = live.slice(i, i + CHUNK);
      const byTier = await Promise.all(TIERS.map((t) => this.priceLines(chunk, t, true)));
      chunk.forEach((p, j) => {
        const retail = byTier[0][j]?.unit_price ?? null;
        if (retail === null) return;
        out.push({ sku: p.sku, unit: p.unit, prices: { RETAIL: retail, CONTRACTOR_TRADE: byTier[1][j]?.unit_price ?? null, VOLUME_CIVIL_BULK: byTier[2][j]?.unit_price ?? null } });
      });
    }
    this.publicCache = { at: Date.now(), value: out };
    return out;
  }

  // --- Helpers ---------------------------------------------------------------------------------------------------

  /** A valid-until date as typed ("2026-11-30" means the end of that day in South Africa); never in the past. */
  validUntil(value?: string | null): Date | null {
    if (!value) return null;
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T23:59:59+02:00` : value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException("The valid-until date isn't a date.");
    if (date <= new Date()) throw new BadRequestException("The valid-until date has already passed.");
    return date;
  }

  /** The rows of an uploaded Excel (.xlsx) or CSV file — price lists, and catalogue imports (docs/catalogue-import.md). */
  read(file: Upload, what = "price list") {
    if (!file?.buffer?.length) throw new BadRequestException(`Choose the ${what} (Excel .xlsx or .csv).`);
    if (file.size > MAX_PRICE_LIST_BYTES) throw new BadRequestException(`That file is over 5 MB — save just the ${what} and try again.`);
    const type = detectScheduleFileType(file.buffer, file.originalname);
    if (!type || (type.extension !== "xlsx" && type.extension !== "csv")) {
      throw new BadRequestException(/\.xls$/i.test(file.originalname ?? "") ? "Save it as an Excel workbook (.xlsx) or CSV — the older .xls format can't be read." : "Upload an Excel workbook (.xlsx) or a CSV file.");
    }
    let rows: string[][];
    try {
      rows = type.extension === "csv" ? csvRows(file.buffer.toString("utf8")) : readFirstSheet(file.buffer);
    } catch (error) {
      throw new BadRequestException((error as Error).message || "We couldn't read that file.");
    }
    const fileName = (file.originalname ?? `${what.replace(/ /g, "-")}.${type.extension}`).replace(/[^\w.\- ()]/g, "_").slice(0, 120);
    return { rows, fileName };
  }

  /** Logged rather than thrown: suggestions from quotations must never stop a quotation going out. */
  async fromQuotationSafely(quoteId: string) {
    await this.fromQuotation(quoteId).catch((error: Error) => this.logger.warn(`Couldn't record quotation costs for ${quoteId}: ${error.message}`));
  }
}

