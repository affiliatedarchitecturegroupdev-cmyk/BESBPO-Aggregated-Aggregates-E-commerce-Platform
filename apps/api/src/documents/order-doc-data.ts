import { Prisma } from "@aggregates/database";
import { orderConfirmationSpec, taxInvoiceSpec, type OrderDocData } from "./order-documents";
import { renderPdf } from "./pdf-renderer";

/** What an order document needs — shared by the downloads and the emailed copies. */
export const ORDER_INCLUDE = {
  lineItems: { include: { product: { select: { name: true, sku: true } } } },
  shipment: true,
  invoice: true,
  user: { select: { name: true, email: true } },
  company: { select: { name: true, vatNumber: true } },
} satisfies Prisma.OrderInclude;
export type LoadedOrder = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export type OrderPdf = { fileName: string; pdf: Buffer };

export async function orderConfirmationPdf(order: LoadedOrder): Promise<OrderPdf> {
  return { fileName: `${order.orderNumber}-order-confirmation.pdf`, pdf: await renderPdf(orderConfirmationSpec(toDocData(order), process.env.EFT_BANKING_DETAILS)) };
}

/** The issued tax invoice, or null before one is issued. */
export async function taxInvoicePdf(order: LoadedOrder): Promise<OrderPdf | null> {
  if (!order.invoice) return null;
  return { fileName: `${order.invoice.invoiceNumber}.pdf`, pdf: await renderPdf(taxInvoiceSpec(order.invoice, toDocData(order), process.env.EFT_BANKING_DETAILS)) };
}

export function toDocData(order: LoadedOrder): OrderDocData {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    expressFee: order.expressFee,
    total: order.total,
    amountPaid: order.amountPaid,
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
