-- SCode: pay in store with a barcode, through PayFast (PAYMENT_ASSETS.md).
ALTER TYPE "PaymentMethodKey" ADD VALUE 'SCODE' AFTER 'SNAPSCAN';
