-- PayFast: the gateway's payment ID on the order, and a log of every payment notification (docs/payments-payfast.md).
ALTER TABLE "Order" ADD COLUMN "paymentReference" TEXT;

CREATE TABLE "PaymentNotification" (
    "id" TEXT NOT NULL,
    "gateway" "PaymentGateway" NOT NULL,
    "orderId" TEXT,
    "providerReference" TEXT,
    "paymentStatus" TEXT,
    "amount" DECIMAL(12,2),
    "outcome" TEXT NOT NULL,
    "reason" TEXT,
    "sourceIp" TEXT,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PaymentNotification_orderId_idx" ON "PaymentNotification"("orderId");
CREATE INDEX "PaymentNotification_createdAt_idx" ON "PaymentNotification"("createdAt");

ALTER TABLE "PaymentNotification" ADD CONSTRAINT "PaymentNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
