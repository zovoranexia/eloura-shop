-- Checkout idempotency: one order per client-generated key, so a retried request never creates a duplicate order.
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
