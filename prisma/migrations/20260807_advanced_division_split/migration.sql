-- ============================================================
-- Advanced division A/B split (Fall 2026)
--
-- 1. Expand the SkillLevel enum: ADVANCED -> ADVANCED_A and add
--    ADVANCED_B. Mirrors the 20260419 Intermediate split.
-- 2. Remap any existing ADVANCED registrations to ADVANCED_A
--    (expected no-op: the Fall 2026 season starts at 0 registrations).
-- 3. Replace Event.maxAdvanced with maxAdvancedA / maxAdvancedB.
--    Any existing maxAdvanced value is carried over to maxAdvancedA.
-- ============================================================

BEGIN;

-- ---- 1 & 2. SkillLevel enum rebuild + remap ----
CREATE TYPE "SkillLevel_new" AS ENUM ('BEGINNER', 'INTERMEDIATE_A', 'INTERMEDIATE_B', 'ADVANCED_A', 'ADVANCED_B');

ALTER TABLE "Registration" ALTER COLUMN "division" DROP DEFAULT;

ALTER TABLE "Registration"
  ALTER COLUMN "division" TYPE "SkillLevel_new"
  USING (
    CASE "division"::text
      WHEN 'ADVANCED' THEN 'ADVANCED_A'::"SkillLevel_new"
      ELSE "division"::text::"SkillLevel_new"
    END
  );

DROP TYPE "SkillLevel";
ALTER TYPE "SkillLevel_new" RENAME TO "SkillLevel";

-- ---- 3. Event capacity: split maxAdvanced into A/B ----
ALTER TABLE "Event"
  ADD COLUMN "maxAdvancedA" INTEGER,
  ADD COLUMN "maxAdvancedB" INTEGER;

UPDATE "Event" SET "maxAdvancedA" = "maxAdvanced" WHERE "maxAdvanced" IS NOT NULL;

ALTER TABLE "Event" DROP COLUMN "maxAdvanced";

COMMIT;
