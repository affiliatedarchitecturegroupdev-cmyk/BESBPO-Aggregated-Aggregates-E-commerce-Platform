import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { StorageService } from "../storage/storage.service";
import { UploadDocumentDto } from "./dto/upload-document.dto";
import { detectDocumentType, MAX_DOCUMENT_BYTES, safeFileName } from "./file-type";

/** Metadata safe to show anyone allowed to see the document — never the storage key. */
export const DOCUMENT_SELECT = {
  id: true,
  title: true,
  standard: true,
  documentType: true,
  batchReference: true,
  fileName: true,
  contentType: true,
  sizeBytes: true,
  issuedAt: true,
  expiresAt: true,
  createdAt: true,
  orderId: true,
  product: { select: { sku: true, name: true } },
} satisfies Prisma.ComplianceDocumentSelect;

/**
 * Compliance Document Attachment (Module 5). Every product category maps
 * to a reference standard — SANS 1200-G for G1-G10 grading, SANS 1083 for
 * concrete aggregate, COLTO/TRH14 for road-building material. Staff attach
 * the relevant SANS reference and, where available, a batch-specific
 * Certificate of Analysis to the product page (public) or to one order
 * record (visible to that order's buyer and staff).
 */
@Injectable()
export class ComplianceDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Public, product-level documents for the product page. */
  listForProduct(sku: string) {
    return this.prisma.complianceDocument.findMany({
      where: { product: { sku }, orderId: null },
      orderBy: [{ issuedAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
      select: DOCUMENT_SELECT,
    });
  }

  listRecent() {
    return this.prisma.complianceDocument.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { ...DOCUMENT_SELECT, order: { select: { orderNumber: true } } },
    });
  }

  async upload(file: Express.Multer.File | undefined, dto: UploadDocumentDto, user: AuthUser) {
    if (!file?.buffer?.length) throw new BadRequestException("Attach a file.");
    if (file.size > MAX_DOCUMENT_BYTES) throw new BadRequestException("Files must be 10MB or smaller.");
    const type = detectDocumentType(file.buffer);
    if (!type) throw new BadRequestException("Upload a PDF, PNG or JPEG file.");

    const product = await this.prisma.product.findUnique({ where: { sku: dto.productSku }, select: { id: true, sku: true, gradingStandard: true } });
    if (!product) throw new NotFoundException(`Unknown product: ${dto.productSku}`);
    const standard = dto.standard?.trim() || product.gradingStandard;
    if (!standard) throw new BadRequestException("This product has no reference standard — enter one.");

    let orderId: string | null = null;
    if (dto.orderNumber) {
      const order = await this.prisma.order.findUnique({
        where: { orderNumber: dto.orderNumber.trim() },
        select: { id: true, lineItems: { select: { productId: true } } },
      });
      if (!order) throw new NotFoundException(`Unknown order: ${dto.orderNumber}`);
      if (!order.lineItems.some((l) => l.productId === product.id)) {
        throw new BadRequestException(`Order ${dto.orderNumber} doesn't include ${product.sku}.`);
      }
      orderId = order.id;
    }

    const fileName = safeFileName(file.originalname, type.extension);
    const storageKey = `${orderId ? `orders/${orderId}` : `products/${product.sku}`}/${randomUUID()}-${fileName}`;
    await this.storage.put(storageKey, file.buffer, type.contentType);
    try {
      return await this.prisma.complianceDocument.create({
        data: {
          productId: product.id,
          orderId,
          title: dto.title.trim(),
          standard,
          documentType: dto.documentType,
          batchReference: dto.batchReference?.trim() || null,
          storageKey,
          fileName,
          contentType: type.contentType,
          sizeBytes: file.size,
          issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          uploadedById: user.id,
        },
        select: DOCUMENT_SELECT,
      });
    } catch (error) {
      await this.storage.remove(storageKey).catch(() => undefined); // don't leave an orphaned file
      throw error;
    }
  }

  /** The file, if the caller may see it. Unknown and forbidden look the same to outsiders. */
  async download(id: string, user?: AuthUser) {
    const document = await this.prisma.complianceDocument.findUnique({
      where: { id },
      include: { order: { select: { userId: true, companyId: true } } },
    });
    if (!document || !this.canSee(document.order, user)) throw new NotFoundException("Document not found.");
    const object = await this.storage.get(document.storageKey);
    if (!object) throw new NotFoundException("Document file is missing.");
    return { document, body: object.body };
  }

  async remove(id: string) {
    const document = await this.prisma.complianceDocument.findUnique({ where: { id }, select: { storageKey: true } });
    if (!document) throw new NotFoundException("Document not found.");
    await this.prisma.complianceDocument.delete({ where: { id } });
    await this.storage.remove(document.storageKey);
  }

  /** Documents on an order record: its own batch documents plus the public documents of its products. */
  forOrders(orders: { id: string; lineItems: { productId: string }[] }[]) {
    const productIds = [...new Set(orders.flatMap((o) => o.lineItems.map((l) => l.productId)))];
    return this.prisma.complianceDocument.findMany({
      where: {
        OR: [{ orderId: { in: orders.map((o) => o.id) } }, { orderId: null, productId: { in: productIds } }],
      },
      orderBy: { createdAt: "desc" },
      select: { ...DOCUMENT_SELECT, productId: true },
    });
  }

  /** Adds each order's documents (see forOrders) as `documents`. */
  async attachToOrders<T extends { id: string; lineItems: { productId: string }[] }>(orders: T[]) {
    if (orders.length === 0) return [];
    const documents = await this.forOrders(orders);
    return orders.map((order) => {
      const productIds = new Set(order.lineItems.map((l) => l.productId));
      return {
        ...order,
        documents: documents
          .filter((d) => d.orderId === order.id || (d.orderId === null && productIds.has(d.productId)))
          .map(({ productId: _productId, ...d }) => d),
      };
    });
  }

  private canSee(order: { userId: string | null; companyId: string | null } | null, user?: AuthUser) {
    if (!order) return true; // product-level documents are public
    if (!user) return false;
    return (
      STAFF_ROLES.includes(user.role) ||
      order.userId === user.id ||
      (order.companyId !== null && order.companyId === user.companyId)
    );
  }
}

