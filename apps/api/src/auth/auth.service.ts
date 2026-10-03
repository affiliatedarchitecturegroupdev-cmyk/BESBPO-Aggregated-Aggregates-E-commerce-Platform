import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserRole } from "@aggregates/database";
import { PrismaService } from "../common/prisma.service";
import { RegisterDto } from "./dto/register.dto";

// Compared against when the email is unknown, so a login takes the same time
// whether or not the account exists.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser", 12);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async registerWithEmail(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password, 12),
        role: UserRole.CUSTOMER,
      },
    });
    return this.session(user.id);
  }

  async loginWithEmail(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user?.passwordHash || !valid) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    return this.session(user.id);
  }

  /** The signed-in user with their company and tier — what the storefront's session shows. */
  profile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: {
          select: {
            id: true,
            name: true,
            status: true,
            tier: { select: { name: true, discountPercent: true } },
            requestedTier: { select: { name: true } },
          },
        },
      },
    });
  }

  /** A signed session token for a user — the storefront keeps it in an httpOnly cookie. */
  issueToken(userId: string) {
    return this.jwt.signAsync({ sub: userId });
  }

  private async session(userId: string) {
    return {
      accessToken: await this.issueToken(userId),
      user: await this.profile(userId),
    };
  }
}
