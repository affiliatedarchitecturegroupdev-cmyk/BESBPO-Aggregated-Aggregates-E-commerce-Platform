-- Email lifecycle (docs/email.md): password reset and verification links, sessions
-- ended by a reset, delivery events and suppressions from the Resend webhook,
-- and newsletter double opt-in with Listmonk sync.

-- New notification events.
ALTER TYPE "NotificationEvent" ADD VALUE 'INVOICE_ISSUED';
ALTER TYPE "NotificationEvent" ADD VALUE 'PASSWORD_RESET';
ALTER TYPE "NotificationEvent" ADD VALUE 'EMAIL_VERIFICATION';
ALTER TYPE "NotificationEvent" ADD VALUE 'NEWSLETTER_CONFIRMATION';

-- CreateEnum
CREATE TYPE "EmailTokenPurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION');

-- AlterTable
ALTER TABLE "NewsletterSubscriber" ADD COLUMN     "confirmSentAt" TIMESTAMP(3),
ADD COLUMN     "confirmToken" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "listmonkError" TEXT,
ADD COLUMN     "listmonkId" INTEGER,
ADD COLUMN     "listmonkSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "deliveryStatus" TEXT,
ADD COLUMN     "deliveryUpdatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "sessionsValidFrom" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "EmailTokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailToken_userId_purpose_createdAt_idx" ON "EmailToken"("userId", "purpose", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailSuppression_email_key" ON "EmailSuppression"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE INDEX "Notification_providerMessageId_idx" ON "Notification"("providerMessageId");

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: subscribers who signed up before double opt-in ticked the consent box; their consent stands.
UPDATE "NewsletterSubscriber" SET "confirmedAt" = "consentAt" WHERE "confirmedAt" IS NULL;
