-- ============================================================
-- Merchandise order: add `fit` (garment cut) column
--
-- Adds a nullable `fit` column to MerchandiseOrder so each order
-- can record the requested cut (e.g. "Men's" / "Women's") in
-- addition to size and color.
--
-- Nullable on purpose: orders placed before this column existed
-- stay valid and simply show a blank fit. No backfill required.
-- The public order form requires fit for all new orders.
-- ============================================================

BEGIN;

ALTER TABLE "MerchandiseOrder"
ADD COLUMN "fit" TEXT;

COMMIT;
