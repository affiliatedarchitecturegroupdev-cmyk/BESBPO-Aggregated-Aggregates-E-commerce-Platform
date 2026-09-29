import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { deliveryNoteSpec, orderConfirmationSpec, taxInvoiceSpec, vatBreakdown, VAT_RATE_PERCENT, type OrderDocData } from "./order-documents";
import { renderPdf } from "./pdf-renderer";

export const DOCUMENT_KINDS = ["confirmation", "delivery-note", "invoice"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

const ORDER_INCLUDE = {
  lineItems: { include: { product: { select: { name: true, sku: true } } } },
  shipment: true,
  invoice: true,
  user: { select: { name: true, email: true } },
  company: { select: { name: true, vatNumber: true } },
} satisfies Prisma.OrderInclude;
type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

/**
 * Downloadable order documents, and tax invoices.
 *
 * Invoices are issued by staff, and only once invoicing is configured:
 * GROUP_VAT_NUMBER must be the Besbpo Group's real VAT number, and
 * PRICES_INCLUDE_VAT=true must confirm that storefront prices already
 * include VAT (so the invoice total is exactly what the buyer was charged).
 * Until both are set the platform refuses to issue one rather than print a
 * tax invoice with guessed details.
 */
@Injectable()
export class OrderDocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** What stops invoices being issued right now (empty when ready). */
  invoicingProblems(): string[] {
    const problems: string[] = [];
    const vat = (process.env.GROUP_VAT_NUMBER ?? "").trim();
    if (!vat || /replace|x{3,}/i.test(vat)) problems.push("Set GROUP_VAT_NUMBER to Besbpo Group's VAT registration number.");
    else if (!/^4\d{9}$/.test(vat.replace(/\s/g, ""))) problems.push("GROUP_VAT_NUMBER should be a 10-digit South African VAT number starting with 4.");
    const inclusive = (process.env.PRICES_INCLUDE_VAT ?? "").trim().toLowerCase();
    if (inclusive === "false") {
      problems.push("PRICES_INCLUDE_VAT is false, but checkout doesn't add VAT yet — invoices would charge more than the buyer paid.");
    } else if (inclusive !== "true") {
      problems.push("Confirm that storefront prices include VAT by setting PRICES_INCLUDE_VAT=true.");
    }
    return problems;
  }

  async render(id: string, kind: DocumentKind, user: AuthUser): Promise<{ fileName: string; pdf: Buffer }> {
    const order = await this.load(id, user);
    const data = toDocData(order);
    if (kind === "confirmation") {
      return { fileName: `${order.orderNumber}-order-confirmation.pdf`, pdf: await renderPdf(orderConfirmationSpec(data, process.env.EFT_BANKING_DETAILS)) };
    }
    if (kind === "delivery-note") {
      if (!order.shipment || !["IN_TRANSIT", "DELIVERED"].includes(order.status)) {
        throw new NotFoundException("The delivery note is available once the order is dispatched.");
      }
      return { fileName: `${order.orderNumber}-delivery-note.pdf`, pdf: await renderPdf(deliveryNoteSpec(data)) };
    }
    if (!order.invoice) throw new NotFoundException("No tax invoice has been issued for this order yet.");
    return { fileName: `${order.invoice.invoiceNumber}.pdf`, pdf: await renderPdf(taxInvoiceSpec(order.invoice, data, process.env.EFT_BANKING_DETAILS)) };
  }

  /** Staff: issue the tax invoice for an order — once, with its details frozen. */
  async issueInvoice(id: string) {
    const problems = this.invoicingProblems();
    if (problems.length) throw new BadRequestException(`Invoicing isn't set up yet: ${problems.join(" ")}`);
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status === "CANCELLED") throw new BadRequestException("A cancelled order can't be invoiced.");
    if (order.invoice) throw new ConflictException(`Invoice ${order.invoice.invoiceNumber} has already been issued for this order.`);

    const { total, vat, exVat } = vatBreakdown(order.total);
    const paid = order.status !== "PENDING";
    const [{ nextval }] = await this.prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
    try {
      return await this.prisma.invoice.create({
        data: {
          orderId: order.id,
          companyId: order.companyId,
          invoiceNumber: `AAI-${nextval.toString().padStart(6, "0")}`,
          vatNumberBilled: process.env.GROUP_VAT_NUMBER!.replace(/\s/g, ""),
          billedToName: order.company?.name ?? order.user?.name ?? order.user?.email ?? "Customer",
          billedToAddress: order.deliveryAddress ? `${order.deliveryAddress}${order.deliveryProvince ? `, ${order.deliveryProvince}` : ""}` : null,
          billedToVatNumber: order.company?.vatNumber ?? null,
          amountDue: total,
          amountExVat: exVat,
          vatAmount: vat,
          vatRatePercent: VAT_RATE_PERCENT,
          pricesIncludedVat: true,
          status: paid ? "PAID" : "UNPAID",
          paidAt: paid ? new Date() : null,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictException("An invoice has already been issued for this order.");
      }
      throw error;
    }
  }

  private async load(id: string, user: AuthUser): Promise<LoadedOrder> {
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    const isOwner = order && (order.userId === user.id || (order.companyId !== null && order.companyId === user.companyId));
    if (!order || !(isOwner || STAFF_ROLES.includes(user.role))) throw new NotFoundException("Order not found.");
    return order;
  }
}

function toDocData(order: LoadedOrder): OrderDocData {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    deliveryAddress: order.deliveryAddress,
    deliveryProvince: order.deliveryProvince,
    deliveryDistanceKm: order.deliveryDistanceKm,
    contactPhone: order.contactPhone,
    notes: order.notes,
    customer: order.user,
    company: order.company,
    lines: order.lineItems.map((l) => ({ name: l.product.name, sku: l.product.sku, quantity: l.quantity, unitOfSale: l.unitOfSale, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
    shipment: order.shipment,
  };
}
