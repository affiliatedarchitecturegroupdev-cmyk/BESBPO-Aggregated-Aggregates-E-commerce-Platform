-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "termsVersion" TEXT;

-- AlterTable
ALTER TABLE "HirePartner" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedById" TEXT,
ADD COLUMN     "termsVersion" TEXT;

