-- ============================================================
-- Skill levels + per-division capacity migration
--
-- 1. Expand the SkillLevel enum: INTERMEDIATE -> INTERMEDIATE_A
--    and add INTERMEDIATE_B. BEGINNER and ADVANCED are unchanged.
-- 2. Remap existing registrations from INTERMEDIATE to INTERMEDIATE_A
--    (admins can reassign the B subset manually in the UI).
-- 3. Replace Event.maxCapacity with per-division caps.
-- ============================================================

BEGIN;

-- ---- 1. SkillLevel enum rename + add ----
-- Postgres doesn't allow ALTER TYPE ... RENAME VALUE inside a
-- transaction alongside other column operations, so we build a
-- new enum type and swap the column over.

CREATE TYPE "SkillLevel_new" AS ENUM ('BEGINNER', 'INTERMEDIATE_A', 'INTERMEDIATE_B', 'ADVANCED');

-- Drop the default so the column can change type cleanly.
ALTER TABLE "Registration" ALTER COLUMN "division" DROP DEFAULT;

ALTER TABLE "Registration"
  ALTER COLUMN "division" TYPE "SkillLevel_new"
  USING (
    CASE "division"::text
      WHEN 'INTERMEDIATE' THEN 'INTERMEDIATE_A'::"SkillLevel_new"
      ELSE "division"::text::"SkillLevel_new"
    END
  );

DROP TYPE "SkillLevel";
ALTER TYPE "SkillLevel_new" RENAME TO "SkillLevel";


-- ---- 2. Event capacity: drop maxCapacity, add per-division caps ----
ALTER TABLE "Event" DROP COLUMN IF EXISTS "maxCapacity";

ALTER TABLE "Event"
  ADD COLUMN "maxBeginner" INTEGER,
  ADD COLUMN "maxIntermediateA" INTEGER,
  ADD COLUMN "maxIntermediateB" INTEGER,
  ADD COLUMN "maxAdvanced" INTEGER;

COMMIT;
