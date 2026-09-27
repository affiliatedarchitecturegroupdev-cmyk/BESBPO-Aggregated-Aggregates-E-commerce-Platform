import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { JwtService } from "@nestjs/jwt";
import type { PrismaService } from "../prisma.service";
import { AuthGuard } from "./auth.guard";
import { IS_PUBLIC, ROLES } from "./decorators";

const users = {
  customer: { id: "u1", email: "c@example.com", name: null, role: "CUSTOMER", companyId: null },
  staff: { id: "u2", email: "s@example.com", name: null, role: "STAFF", companyId: null },
};

function guardFor(meta: { isPublic?: boolean; roles?: string[] }) {
  const reflector = new Reflector();
  jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => (key === IS_PUBLIC ? meta.isPublic : key === ROLES ? meta.roles : undefined));
  const jwt = { verifyAsync: jest.fn(async (token: string) => ({ sub: token })) } as unknown as JwtService;
  const prisma = { user: { findUnique: jest.fn(async ({ where }: { where: { id: string } }) => users[where.id as keyof typeof users] ?? null) } };
  return new AuthGuard(reflector, jwt, prisma as unknown as PrismaService);
}

function context(token?: string) {
  const request = { headers: token ? { authorization: `Bearer ${token}` } : {} } as { headers: Record<string, string>; user?: unknown };
  return {
    request,
    ctx: { getHandler: () => undefined, getClass: () => undefined, switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext,
  };
}

describe("AuthGuard", () => {
  it("lets anyone through a public route and still identifies signed-in callers", async () => {
    const { ctx, request } = context("customer");
    await expect(guardFor({ isPublic: true }).canActivate(context().ctx)).resolves.toBe(true);
    await expect(guardFor({ isPublic: true }).canActivate(ctx)).resolves.toBe(true);
    expect(request.user).toEqual(users.customer);
  });

  it("requires a session everywhere else", async () => {
    await expect(guardFor({}).canActivate(context().ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guardFor({}).canActivate(context("unknown-user").ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guardFor({}).canActivate(context("customer").ctx)).resolves.toBe(true);
  });

  it("enforces @Roles even when the controller is @Public", async () => {
    const guard = guardFor({ isPublic: true, roles: ["STAFF", "ADMIN"] });
    await expect(guard.canActivate(context().ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(guard.canActivate(context("customer").ctx)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(guard.canActivate(context("staff").ctx)).resolves.toBe(true);
  });
});
