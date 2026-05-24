-- ============================================================
-- Admin-editable content migration
--
-- Adds the ContentBlock table that backs the lightweight,
-- database-driven content system for the registration flow.
-- Each row is one editable piece of copy, keyed by a stable
-- string (e.g. "register_form_title"). Public pages look content
-- up by key and fall back to a built-in default when a row is
-- missing, so the site never breaks if a key is absent.
--
-- Keys are seed-defined and edit-only; the admin UI does not
-- create or delete keys.
-- ============================================================

BEGIN;

-- ---- ContentFormat enum (plain text vs. sanitized markdown) ----
CREATE TYPE "ContentFormat" AS ENUM ('TEXT', 'MARKDOWN');

-- ---- ContentBlock table ----
CREATE TABLE "ContentBlock" (
    "id"        TEXT NOT NULL,
    "key"       TEXT NOT NULL,
    "page"      TEXT NOT NULL,
    "label"     TEXT NOT NULL,
    "value"     TEXT NOT NULL,
    "format"    "ContentFormat" NOT NULL DEFAULT 'TEXT',
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- Unique key lookup + page grouping index for the admin UI.
CREATE UNIQUE INDEX "ContentBlock_key_key" ON "ContentBlock"("key");
CREATE INDEX "ContentBlock_page_idx" ON "ContentBlock"("page");

COMMIT;
