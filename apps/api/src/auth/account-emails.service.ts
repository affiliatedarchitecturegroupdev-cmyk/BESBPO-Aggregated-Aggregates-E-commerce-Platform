import { BadRequestException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { EmailTokenPurpose } from "@aggregates/database";
import { assertStrongEnough } from "../common/password-policy";
import { PrismaService } from "../common/prisma.service";
import { emailVerificationEmail, passwordResetEmail } from "../notifications/account-emails";
import { siteUrl } from "../notifications/notification-templates";
import { NotificationsService } from "../notifications/notifications.service";

export const RESET_VALID_MINUTES = 60;
export const VERIFY_VALID_HOURS = 48;
/** At most this many links of one kind per account per hour — enough for a typo, not for mail-bombing someone. */
const MAX_PER_HOUR = 3;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

/**
 * Password reset and email verification (docs/email.md). Links are one-time,
 * expire, and only their SHA-256 is stored. Asking for a reset never says
 * whether an account exists. A reset proves the person owns the mailbox, so
 * it also verifies the address — and it signs out every other session.
 */
@Injectable()
export class AccountEmailsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Always the same answer, so the form can't be used to find out who has an account. */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } });
    if (user && !(await this.overLimit(user.id, "PASSWORD_RESET"))) {
      const token = await this.issue(user.id, user.email, "PASSWORD_RESET", RESET_VALID_MINUTES * 60_000);
      // Sent in the background, so the reply takes the same time whether or not the account exists.
      void this.notifications.system("PASSWORD_RESET", user.email, passwordResetEmail(user.name, `${siteUrl()}/account/reset-password?token=${token}`, RESET_VALID_MINUTES)).catch(() => undefined);
    }
    return { sent: true };
  }

  /** Sets the new password from a reset link. Returns the user ID so the caller can sign them in. */
  async resetPassword(token: string, newPassword: string) {
    const link = await this.redeemable(token, "PASSWORD_RESET");
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: link.userId }, select: { id: true, name: true, email: true, mobileNumber: true, emailVerifiedAt: true } });
    assertStrongEnough(newPassword, [user.name, user.email, user.mobileNumber]);
    const now = new Date();
    // JWT issue times are whole seconds: start the cut-off on a whole second so the new session survives it.
    const cutoff = new Date(Math.floor(now.getTime() / 1000) * 1000);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(newPassword, 12), sessionsValidFrom: cutoff, emailVerifiedAt: user.emailVerifiedAt ?? now },
      }),
      // This link, and any other reset link still out there, stop working.
      this.prisma.emailToken.updateMany({ where: { userId: user.id, purpose: "PASSWORD_RESET", usedAt: null }, data: { usedAt: now } }),
    ]);
    return { userId: user.id };
  }

  /** Sends (or re-sends) the "confirm your email address" link. */
  async sendVerification(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, email: true, name: true, emailVerifiedAt: true } });
    if (user.emailVerifiedAt) return { sent: false, alreadyVerified: true };
    if (await this.overLimit(user.id, "EMAIL_VERIFICATION")) {
      throw new BadRequestException("We've sent a few links already — check your inbox and spam folder, or try again in an hour.");
    }
    const token = await this.issue(user.id, user.email, "EMAIL_VERIFICATION", VERIFY_VALID_HOURS * 3_600_000);
    await this.notifications.system("EMAIL_VERIFICATION", user.email, emailVerificationEmail(user.name, `${siteUrl()}/account/verify-email?token=${token}`, VERIFY_VALID_HOURS));
    return { sent: true, alreadyVerified: false };
  }

  async verifyEmail(token: string) {
    const link = await this.redeemable(token, "EMAIL_VERIFICATION");
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: link.userId }, data: { emailVerifiedAt: now } }),
      this.prisma.emailToken.updateMany({ where: { userId: link.userId, purpose: "EMAIL_VERIFICATION", usedAt: null }, data: { usedAt: now } }),
    ]);
    return { verified: true };
  }

  private async issue(userId: string, email: string, purpose: EmailTokenPurpose, validMs: number) {
    const token = newToken();
    await this.prisma.emailToken.create({ data: { userId, email, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + validMs) } });
    return token;
  }

  private async overLimit(userId: string, purpose: EmailTokenPurpose) {
    const recent = await this.prisma.emailToken.count({ where: { userId, purpose, createdAt: { gt: new Date(Date.now() - 3_600_000) } } });
    return recent >= MAX_PER_HOUR;
  }

  /** A link that's unused, unexpired, and still for the account's current address. */
  private async redeemable(token: string, purpose: EmailTokenPurpose) {
    const link = await this.prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { email: true } } } });
    const valid = link && link.purpose === purpose && !link.usedAt && link.expiresAt > new Date() && link.email === link.user.email;
    if (!valid) {
      throw new BadRequestException(
        purpose === "PASSWORD_RESET"
          ? "This reset link has expired or has already been used. Ask for a new one."
          : "This confirmation link has expired or has already been used. Sign in and ask for a new one.",
      );
    }
    return link;
  }
}
