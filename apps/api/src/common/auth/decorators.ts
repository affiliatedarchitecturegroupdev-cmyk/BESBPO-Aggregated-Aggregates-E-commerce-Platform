import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@aggregates/database";

export const IS_PUBLIC = "isPublic";
export const ROLES = "roles";

/**
 * Opens a route to anonymous callers. Every other route requires a valid
 * session token — secure by default. A public route still sees `req.user`
 * when the caller happens to be signed in.
 */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Restricts a route to the given roles (on top of requiring sign-in). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);
