-- AlterTable
ALTER TABLE "DeliveryAddress" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "amountExVat" DECIMAL(12,2),
ADD COLUMN     "billedToAddress" TEXT,
ADD COLUMN     "billedToName" TEXT,
ADD COLUMN     "billedToVatNumber" TEXT,
ADD COLUMN     "pricesIncludedVat" BOOLEAN,
ADD COLUMN     "vatAmount" DECIMAL(12,2),
ADD COLUMN     "vatRatePercent" DECIMAL(5,2);

-- CreateIndex
CREATE INDEX "DeliveryAddress_companyId_idx" ON "DeliveryAddress"("companyId");

-- CreateIndex
CREATE INDEX "DeliveryAddress_userId_idx" ON "DeliveryAddress"("userId");

-- AddForeignKey
ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A saved address belongs to a company or to one customer, never both or neither.
ALTER TABLE "DeliveryAddress" ADD CONSTRAINT "DeliveryAddress_owner_check" CHECK (("companyId" IS NULL) <> ("userId" IS NULL));

-- Tax invoice serial numbers (AAI-000001, …): unique and issued in order.
CREATE SEQUENCE "invoice_number_seq" START 1;
