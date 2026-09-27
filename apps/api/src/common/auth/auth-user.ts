import type { UserRole } from "@aggregates/database";

/** What the auth guard attaches to `req.user` for a signed-in request. */
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  companyId: string | null;
};

export const STAFF_ROLES: UserRole[] = ["STAFF", "ADMIN"];
