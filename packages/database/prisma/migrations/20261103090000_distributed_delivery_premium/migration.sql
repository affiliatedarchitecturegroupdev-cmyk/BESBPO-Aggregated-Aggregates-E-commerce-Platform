-- Distributed Delivery Premium (docs/delivery-premium.md).
ALTER TABLE "Order" ADD COLUMN "ddpFee" DECIMAL(10,2),
ADD COLUMN "ddpDetail" JSONB;
