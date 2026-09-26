import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";

/**
 * Compliance Document Attachment (Module 5). Every product category maps
 * to a reference standard — SANS 1200-G for G1-G10 grading, SANS 1083 for
 * concrete aggregate, COLTO/TRH14 for road-building material. Attaches the
 * relevant SANS reference and, where available, a batch-specific
 * Certificate of Analysis to the product page and the order record.
 */
@Injectable()
export class ComplianceDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  listForProduct(productId: string) {
    return this.prisma.complianceDocument.findMany({
      where: { productId },
      orderBy: { issuedAt: "desc" },
    });
  }
}
