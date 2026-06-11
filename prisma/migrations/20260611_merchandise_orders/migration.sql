-- ============================================================
-- Merchandise order feature migration
--
-- 1. Adds a FormType enum + formType column to Event so an event
--    can render either the league registration form (default) or
--    a shirt order form.
-- 2. Adds merch-specific fields to Event (unit price, available
--    colors, order window). Existing events keep formType=LEAGUE
--    and NULL/empty merch fields — no data migration needed.
-- 3. Creates the MerchandiseOrder table. One row per submitted
--    order (no cart logic); rows are written only after Stripe
--    payment succeeds.
-- ============================================================

BEGIN;

-- ---- FormType enum ----
CREATE TYPE "FormType" AS ENUM ('LEAGUE', 'MERCHANDISE');

-- ---- Event: form type + merch fields ----
ALTER TABLE "Event"
ADD COLUMN "formType"        "FormType" NOT NULL DEFAULT 'LEAGUE',
ADD COLUMN "unitPrice"       DECIMAL(10,2),
ADD COLUMN "availableColors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "orderOpenDate"   TIMESTAMP(3),
ADD COLUMN "orderCloseDate"  TIMESTAMP(3);

-- ---- MerchandiseOrder table ----
CREATE TABLE "MerchandiseOrder" (
    "id"                    TEXT NOT NULL,
    "eventId"               TEXT NOT NULL,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name"                  TEXT NOT NULL,
    "email"                 TEXT NOT NULL,
    "size"                  TEXT NOT NULL,
    "color"                 TEXT NOT NULL,
    "quantity"              INTEGER NOT NULL DEFAULT 1,
    "unitPrice"             DECIMAL(10,2) NOT NULL,
    "totalAmount"           DECIMAL(10,2) NOT NULL,
    "stripeSessionId"       TEXT,
    "stripePaymentIntentId" TEXT,
    "stripePaymentStatus"   TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "MerchandiseOrder_pkey" PRIMARY KEY ("id")
);

-- Unique session id makes webhook + success-page writes idempotent.
CREATE UNIQUE INDEX "MerchandiseOrder_stripeSessionId_key" ON "MerchandiseOrder"("stripeSessionId");
CREATE INDEX "MerchandiseOrder_eventId_idx" ON "MerchandiseOrder"("eventId");
CREATE INDEX "MerchandiseOrder_email_idx" ON "MerchandiseOrder"("email");

ALTER TABLE "MerchandiseOrder"
ADD CONSTRAINT "MerchandiseOrder_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
