import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@aggregates/database";
import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import { PrismaService } from "../common/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { orderConfirmationPdf, ORDER_INCLUDE, taxInvoicePdf, toDocData, type LoadedOrder } from "./order-doc-data";
import { groupVatNumber, VAT_RATE_PERCENT } from "../tax/tax";
import { deliveryNoteSpec, proformaSpec, vatBreakdown } from "./order-documents";
import { renderPdf } from "./pdf-renderer";

export const DOCUMENT_KINDS = ["confirmation", "proforma", "delivery-note", "invoice"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];


/**
 * Downloadable order documents, and invoices (docs/vat.md).
 *
 * Staff issue each order's invoice. Before VAT registration (GROUP_VAT_NUMBER
 * unset) it is a plain invoice with no VAT anywhere. Once GROUP_VAT_NUMBER is
 * set it is a tax invoice, and PRICES_INCLUDE_VAT=true must also confirm that
 * storefront prices already include VAT (so the invoice total is exactly what
 * the buyer was charged); until it does, the platform refuses to issue one
 * rather than print a tax invoice with guessed details.
 */
@Injectable()
export class OrderDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** What stops invoices being issued right now (empty when ready). Unregistered: none — plain invoices. */
  invoicingProblems(): string[] {
    const problems: string[] = [];
    const vat = (process.env.GROUP_VAT_NUMBER ?? "").trim();
    if (!vat) return problems;
    if (!groupVatNumber(vat)) {
      problems.push("GROUP_VAT_NUMBER should be a 10-digit South African VAT number starting with 4 — or leave it empty until the business is VAT-registered.");
      return problems;
    }
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
      return orderConfirmationPdf(order);
    }
    if (kind === "proforma") return this.proforma(order);
    if (kind === "delivery-note") {
      if (!order.shipment || !["IN_TRANSIT", "DELIVERED"].includes(order.status)) {
        throw new NotFoundException("The delivery note is available once the order is dispatched.");
      }
      return { fileName: `${order.orderNumber}-delivery-note.pdf`, pdf: await renderPdf(deliveryNoteSpec(data)) };
    }
    const invoice = await taxInvoicePdf(order);
    if (!invoice) throw new NotFoundException("No invoice has been issued for this order yet.");
    return invoice;
  }

  /**
   * A proforma for what's due now: the given amount (a payment link's), else
   * the outstanding balance. Used by the order page and the public pay page.
   */
  async proforma(orderOrId: LoadedOrder | string, due?: { amount: number; kind: string; validUntil?: Date | null }): Promise<{ fileName: string; pdf: Buffer }> {
    const order = typeof orderOrId === "string" ? await this.prisma.order.findUnique({ where: { id: orderOrId }, include: ORDER_INCLUDE }) : orderOrId;
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status === "CANCELLED") throw new BadRequestException("This order was cancelled.");
    if (order.approvalStatus === "AWAITING") throw new BadRequestException("This order is waiting for your company's approval — the proforma is ready once it's approved.");
    const balance = Math.round((Number(order.total) - Number(order.amountPaid)) * 100) / 100;
    if (!due && balance <= 0.01) throw new BadRequestException("This order is paid in full — download the invoice instead.");
    const owed = due ?? { amount: balance, kind: Number(order.amountPaid) > 0 ? "BALANCE" : "FULL" };
    return { fileName: `${order.orderNumber}-proforma.pdf`, pdf: await renderPdf(proformaSpec(toDocData(order), { ...owed, amount: new Prisma.Decimal(owed.amount) }, process.env.EFT_BANKING_DETAILS)) };
  }

  /** Staff: issue the invoice for an order — once, with its details frozen (a tax invoice once VAT-registered). */
  async issueInvoice(id: string) {
    const problems = this.invoicingProblems();
    if (problems.length) throw new BadRequestException(`Invoicing isn't set up yet: ${problems.join(" ")}`);
    const order = await this.prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!order) throw new NotFoundException("Order not found.");
    if (order.status === "CANCELLED") throw new BadRequestException("A cancelled order can't be invoiced.");
    if (order.invoice) throw new ConflictException(`Invoice ${order.invoice.invoiceNumber} has already been issued for this order.`);

    const vatNumber = groupVatNumber();
    const { total, vat, exVat } = vatBreakdown(order.total);
    // Paid only once the ledger covers the total (a deposit leaves it unpaid until the balance is in).
    const paid = order.status !== "PENDING" && Number(order.amountPaid) >= Number(order.total) - 0.01;
    const [{ nextval }] = await this.prisma.$queryRaw<{ nextval: bigint }[]>`SELECT nextval('invoice_number_seq')`;
    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          orderId: order.id,
          companyId: order.companyId,
          invoiceNumber: `AAI-${nextval.toString().padStart(6, "0")}`,
          vatNumberBilled: vatNumber,
          billedToName: order.company?.name ?? order.user?.name ?? order.user?.email ?? "Customer",
          billedToAddress: order.deliveryAddress ? `${order.deliveryAddress}${order.deliveryProvince ? `, ${order.deliveryProvince}` : ""}` : null,
          billedToVatNumber: order.company?.vatNumber ?? null,
          amountDue: total,
          // Before VAT registration there is no VAT to show or account for.
          amountExVat: vatNumber ? exVat : null,
          vatAmount: vatNumber ? vat : null,
          vatRatePercent: vatNumber ? VAT_RATE_PERCENT : null,
          pricesIncludedVat: vatNumber ? true : null,
          status: paid ? "PAID" : "UNPAID",
          paidAt: paid ? new Date() : null,
        },
      });
      // The buyer gets an email with the invoice attached.
      await this.notifications.order("INVOICE_ISSUED", order.id);
      return invoice;
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
