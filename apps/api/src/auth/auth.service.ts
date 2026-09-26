import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { OAuthProvider, UserRole } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async registerWithEmail(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        role: UserRole.CUSTOMER,
      },
    });

    return this.sanitize(user);
  }

  async validateEmailLogin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    return this.sanitize(user);
  }

  /** Finds or creates a user from an OAuth (Google/Microsoft) profile. */
  async findOrCreateOAuthUser(provider: OAuthProvider, providerAccountId: string, email: string, name?: string) {
    const existingLink = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
      include: { user: true },
    });
    if (existingLink) {
      return this.sanitize(existingLink.user);
    }

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, name, role: UserRole.CUSTOMER },
    });

    await this.prisma.oAuthAccount.create({
      data: { provider, providerAccountId, userId: user.id },
    });

    return this.sanitize(user);
  }

  private sanitize(user: { passwordHash?: string | null; [key: string]: unknown }) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
