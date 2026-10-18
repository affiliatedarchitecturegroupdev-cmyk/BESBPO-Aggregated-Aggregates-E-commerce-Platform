import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { randomBytes } from "node:crypto";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { detectScheduleFileType } from "../cut-and-bend/bar-schedule";
import { pricingUnit } from "../pricing/units";
import { CreateQuoteDto } from "../quotes/dto/create-quote.dto";
import { QuotesService } from "../quotes/quotes.service";
import { StorageService } from "../storage/storage.service";
import { boqItems, csvRows, indexCatalogue, matchItem, MAX_BOQ_BYTES } from "./boq";
import { readFirstSheet } from "./xlsx";

type Upload = { buffer: Buffer; size: number; originalname?: string } | undefined;

/**
 * Bill of quantities upload (docs/boq-upload.md). Step one reads the file
 * and suggests products; nothing is kept. Step two — once the customer has
 * confirmed the lines — creates a quote request with the file attached for
 * our team, and lists anything that didn't match so it's quoted as written.
 */
@Injectable()
export class BoqService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuotesService,
    private readonly storage: StorageService,
  ) {}

  async parse(file: Upload) {
    const { rows, fileName } = this.read(file);
    const items = boqItems(rows);
    if (items.length === 0) {
      throw new BadRequestException("We couldn't find any lines with a description and a quantity. Put them in columns headed Description, Qty and Unit, then upload it again.");
    }
    const products = await this.prisma.product.findMany({ where: { isActive: true }, select: { sku: true, name: true, unitsOfSale: true, category: { select: { name: true } } } });
    const catalogue = indexCatalogue(products.map((p) => ({ sku: p.sku, name: p.name, category: p.category.name, unitsOfSale: p.unitsOfSale })));
    return {
      fileName,
      items: items.map((item) => ({
        ...item,
        matches: matchItem(item, catalogue).flatMap((m) => {
          try {
            return [{ ...m, unit: pricingUnit(m.unitOfSale as never) }];
          } catch {
            return [];
          }
        }),
      })),
    };
  }

  /** Creates the quote request from the confirmed lines, with the BOQ attached. */
  async submit(file: Upload, payload: string | undefined, user?: AuthUser) {
    const { fileName, type } = this.read(file);
    let body: unknown;
    try {
      body = JSON.parse(payload ?? "");
    } catch {
      throw new BadRequestException("The request details are missing.");
    }
    const { unmatched, ...rest } = (body ?? {}) as { unmatched?: unknown };
    const dto = plainToInstance(CreateQuoteDto, rest);
    const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (errors.length) {
      const messages = errors.flatMap(function collect(e): string[] {
        return [...Object.values(e.constraints ?? {}), ...(e.children ?? []).flatMap(collect)];
      });
      throw new BadRequestException(messages);
    }
    const leftover = Array.isArray(unmatched)
      ? unmatched
          .filter((u): u is { description: string; quantity: number; unit?: string | null } => typeof u?.description === "string" && typeof u?.quantity === "number")
          .slice(0, 200)
          .map((u) => `• ${u.description.slice(0, 200)} — ${u.quantity}${u.unit ? ` ${String(u.unit).slice(0, 20)}` : ""}`)
      : [];
    if (leftover.length) {
      const note = `Also on the bill of quantities (not matched to the catalogue — please quote as written):\n${leftover.join("\n")}`;
      dto.notes = [dto.notes?.trim(), note].filter(Boolean).join("\n\n").slice(0, 8000);
    }
    const storageKey = `boq/${new Date().toISOString().slice(0, 7)}/${randomBytes(12).toString("hex")}.${type.extension}`;
    await this.storage.put(storageKey, file!.buffer, type.contentType);
    try {
      return await this.quotes.create(dto, user, { fileName, storageKey });
    } catch (error) {
      await this.storage.remove(storageKey).catch(() => undefined);
      throw error;
    }
  }

  /** The uploaded BOQ, for the requester or staff. */
  async download(quoteId: string, user: AuthUser) {
    const quote = await this.prisma.quote.findUnique({ where: { id: quoteId }, select: { userId: true, companyId: true, boqStorageKey: true, boqFileName: true } });
    const allowed = quote && (STAFF_ROLES.includes(user.role) || quote.userId === user.id || (quote.companyId !== null && quote.companyId === user.companyId));
    if (!quote?.boqStorageKey || !allowed) throw new NotFoundException("Not found.");
    const object = await this.storage.get(quote.boqStorageKey);
    if (!object) throw new NotFoundException("Not found.");
    return { ...object, fileName: quote.boqFileName ?? "bill-of-quantities" };
  }

  private read(file: Upload) {
    if (!file?.buffer?.length) throw new BadRequestException("Choose your bill of quantities (Excel .xlsx or .csv).");
    if (file.size > MAX_BOQ_BYTES) throw new BadRequestException("That file is over 5 MB — save just the bill of quantities and try again.");
    const type = detectScheduleFileType(file.buffer, file.originalname);
    if (!type || (type.extension !== "xlsx" && type.extension !== "csv")) {
      throw new BadRequestException(/\.xls$/i.test(file.originalname ?? "") ? "Save it as an Excel workbook (.xlsx) or CSV — the older .xls format can't be read." : "Upload an Excel workbook (.xlsx) or a CSV file. For a PDF bill of quantities, request a quote and email the PDF to our sales team.");
    }
    let rows: string[][];
    try {
      rows = type.extension === "csv" ? csvRows(file.buffer.toString("utf8")) : readFirstSheet(file.buffer);
    } catch (error) {
      throw new BadRequestException((error as Error).message || "We couldn't read that file.");
    }
    const fileName = (file.originalname ?? `bill-of-quantities.${type.extension}`).replace(/[^\w.\- ()]/g, "_").slice(0, 120);
    return { rows, fileName, type };
  }
}
