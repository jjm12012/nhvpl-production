-- ============================================================
-- Merch products migration
--
-- One merchandise event can now sell several products (e.g. a
-- T-Shirt and a Hoodie), each with its own price, colors, sizes,
-- and optional fit list.
--
-- 1. Creates the MerchProduct table.
-- 2. Backfills exactly one product per existing MERCHANDISE event
--    from that event's own unitPrice / availableColors, with the
--    historical shirt size + fit lists.
-- 3. Adds productId + productName to MerchandiseOrder, points every
--    existing order at its event's backfilled product, then makes
--    both columns NOT NULL.
--
-- Safe to run BEFORE the matching code deploy: old code ignores the
-- new table and columns. Event.unitPrice / Event.availableColors are
-- left in place (deprecated) and dropped in a later migration.
-- ============================================================

BEGIN;

-- ---- MerchProduct table ----
CREATE TABLE "MerchProduct" (
    "id"              TEXT NOT NULL,
    "eventId"         TEXT NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "unitPrice"       DECIMAL(10,2) NOT NULL,
    "availableColors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sizes"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "fits"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sortOrder"       INTEGER NOT NULL DEFAULT 0,
    "isActive"        BOOLEAN NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MerchProduct_eventId_idx" ON "MerchProduct"("eventId");

ALTER TABLE "MerchProduct"
ADD CONSTRAINT "MerchProduct_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Backfill: one product per existing merchandise event ----
-- Product id is derived from the event id so the statement is idempotent
-- and the fold-in script can find these rows deterministically.
INSERT INTO "MerchProduct"
    ("id", "eventId", "name", "description", "unitPrice", "availableColors", "sizes", "fits", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
    'prod_' || e."id",
    e."id",
    'T-Shirt',
    NULL,
    COALESCE(e."unitPrice", 0),
    e."availableColors",
    ARRAY['XS','S','M','L','XL','2XL','3XL','4XL']::TEXT[],
    ARRAY['Men''s','Women''s']::TEXT[],
    0,
    true,
    e."createdAt",
    CURRENT_TIMESTAMP
FROM "Event" e
WHERE e."formType" = 'MERCHANDISE'
ON CONFLICT ("id") DO NOTHING;

-- ---- MerchandiseOrder: product columns ----
ALTER TABLE "MerchandiseOrder"
ADD COLUMN "productId"   TEXT,
ADD COLUMN "productName" TEXT;

UPDATE "MerchandiseOrder" o
SET "productId"   = p."id",
    "productName" = p."name"
FROM "MerchProduct" p
WHERE p."eventId" = o."eventId"
  AND o."productId" IS NULL;

-- Every order must now have a product. If this fails, an order exists on a
-- non-merchandise event (should be impossible) — investigate before retrying.
ALTER TABLE "MerchandiseOrder"
ALTER COLUMN "productId"   SET NOT NULL,
ALTER COLUMN "productName" SET NOT NULL;

CREATE INDEX "MerchandiseOrder_productId_idx" ON "MerchandiseOrder"("productId");

ALTER TABLE "MerchandiseOrder"
ADD CONSTRAINT "MerchandiseOrder_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "MerchProduct"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT;
