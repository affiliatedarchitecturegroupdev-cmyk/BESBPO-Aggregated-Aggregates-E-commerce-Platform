import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { UserRole } from "@aggregates/database";
import { PrismaService } from "../prisma.service";
import type { AuthUser } from "./auth-user";
import { IS_PUBLIC, ROLES } from "./decorators";

/**
 * Global guard: verifies the `Authorization: Bearer` session token, reloads
 * the user (so role and company changes apply immediately, and deleted users
 * lose access), and enforces @Roles.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets) ?? false;
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES, targets);
    const request = context.switchToHttp().getRequest();

    const user = await this.resolveUser(request.headers.authorization);
    if (user) {
      request.user = user;
    }

    // @Roles always wins, even inside a @Public controller.
    if (roles) {
      if (!user) throw new UnauthorizedException("Sign in to continue.");
      if (!roles.includes(user.role)) throw new ForbiddenException("You don't have access to this.");
      return true;
    }
    if (isPublic) {
      return true;
    }
    if (!user) {
      throw new UnauthorizedException("Sign in to continue.");
    }
    return true;
  }

  private async resolveUser(header: string | undefined): Promise<AuthUser | null> {
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return null;
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token);
      return await this.prisma.user.findUnique({
        where: { id: sub },
        select: { id: true, email: true, name: true, role: true, companyId: true },
      });
    } catch {
      return null;
    }
  }
}
