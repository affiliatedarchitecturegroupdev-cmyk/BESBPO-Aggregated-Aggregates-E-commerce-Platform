import { STAFF_ROLES, type AuthUser } from "../common/auth/auth-user";
import type { PrismaService } from "../common/prisma.service";

export type OrderViewer = "OWNER" | "STAFF" | "SUPPLIER";

/**
 * Who may see an order's deliveries: the buyer (or their company), staff,
 * or the partner supplier fulfilling it (a SUPPLIER login linked to that
 * supplier — the link is read fresh each time, never from the session).
 */
export async function orderViewer(
  prisma: PrismaService,
  order: { userId: string | null; companyId: string | null; fulfilledBySupplierId: string | null },
  user: AuthUser,
): Promise<OrderViewer | null> {
  if (STAFF_ROLES.includes(user.role)) return "STAFF";
  if (order.userId === user.id || (order.companyId !== null && order.companyId === user.companyId)) return "OWNER";
  if (user.role === "SUPPLIER" && order.fulfilledBySupplierId) {
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { supplierLocationId: true } });
    if (row?.supplierLocationId === order.fulfilledBySupplierId) return "SUPPLIER";
  }
  return null;
}

/** The supplier a SUPPLIER login is linked to, or null. */
export async function linkedSupplierId(prisma: PrismaService, user: AuthUser): Promise<string | null> {
  if (user.role !== "SUPPLIER") return null;
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { supplierLocationId: true, supplierLocation: { select: { isActive: true } } } });
  return row?.supplierLocationId && row.supplierLocation?.isActive ? row.supplierLocationId : null;
}
