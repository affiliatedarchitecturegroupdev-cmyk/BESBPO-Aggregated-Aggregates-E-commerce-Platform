import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { UserRole } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import type { AuthUser } from "../common/auth/auth-user";
import type { TeamRole } from "./team.dto";

const MEMBER_FIELDS = { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true } as const;

/**
 * Admin → Team: admins give registered accounts staff or admin access, change
 * it, or take it away. Nobody can sign up as staff — a person registers as a
 * customer first, then an admin promotes that account here (or with
 * `pnpm db:set-role`). The auth guard reads the role from the database on
 * every request, so a change takes effect on the person's next click.
 *
 * Guard rails: an admin can't change their own role (so nobody locks
 * themselves out by accident), the last admin can't be demoted, and trade
 * company admins aren't promoted (their role runs their company's trade
 * account — staff use a separate account).
 */
@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const members = await this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.STAFF] } },
      orderBy: [{ role: "asc" }, { email: "asc" }],
      select: MEMBER_FIELDS,
    });
    return { members, admins: members.filter((m) => m.role === UserRole.ADMIN).length, staff: members.filter((m) => m.role === UserRole.STAFF).length };
  }

  async grant(actor: AuthUser, email: string, role: TeamRole) {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!user) throw new NotFoundException(`No account uses ${email}. Ask them to register on the storefront first, then add them here.`);
    if (user.role === role) throw new ConflictException(`${email} is already ${role === UserRole.ADMIN ? "an admin" : "on the staff"}.`);
    return this.change(actor, user.id, role);
  }

  async change(actor: AuthUser, userId: string, role: TeamRole | "CUSTOMER") {
    if (userId === actor.id) throw new BadRequestException("You can't change your own access. Ask another admin.");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true } });
    if (!user) throw new NotFoundException("Account not found.");
    if (user.role === UserRole.COMPANY_ADMIN) {
      throw new BadRequestException(`${user.email} runs a trade account. Staff need their own separate account — ask them to register with a work email.`);
    }
    if (user.role === UserRole.ADMIN && role !== UserRole.ADMIN) {
      const admins = await this.prisma.user.count({ where: { role: UserRole.ADMIN } });
      if (admins <= 1) throw new BadRequestException("The store needs at least one admin.");
    }
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { role }, select: MEMBER_FIELDS });
    this.logger.log(`${actor.email} changed ${user.email} from ${user.role} to ${role}.`);
    return updated;
  }
}
