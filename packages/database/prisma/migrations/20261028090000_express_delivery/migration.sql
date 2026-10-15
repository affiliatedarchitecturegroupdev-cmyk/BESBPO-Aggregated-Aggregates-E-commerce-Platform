-- AA 60/120 express delivery: the fee and the clock on the order, and three notification events.
ALTER TYPE "NotificationEvent" ADD VALUE 'EXPRESS_PAID';
ALTER TYPE "NotificationEvent" ADD VALUE 'EXPRESS_ACCEPTED';
ALTER TYPE "NotificationEvent" ADD VALUE 'EXPRESS_DECLINED';

ALTER TABLE "Order" ADD COLUMN "expressFee" DECIMAL(10,2),
ADD COLUMN "expressAcceptedAt" TIMESTAMP(3),
ADD COLUMN "expressDueAt" TIMESTAMP(3),
ADD COLUMN "expressDeclinedAt" TIMESTAMP(3),
ADD COLUMN "expressNote" TEXT;

CREATE INDEX "Order_expressDueAt_idx" ON "Order"("expressDueAt");
