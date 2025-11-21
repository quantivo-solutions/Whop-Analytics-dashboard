-- Migration: User-Level Plans
-- This migration:
-- 1. Ensures userId is NOT NULL (backfills if needed)
-- 2. Creates UserPlan table if it doesn't exist
-- 3. Adds composite unique constraint companyId_userId
-- 4. Updates indexes

-- Step 1: Backfill userId for any existing installations without userId
-- Use a temporary value based on companyId for installations without userId
UPDATE "WhopInstallation"
SET "userId" = 'migrated_' || "companyId"
WHERE "userId" IS NULL;

-- Step 2: Make userId NOT NULL
ALTER TABLE "WhopInstallation" 
ALTER COLUMN "userId" SET NOT NULL;

-- Step 3: Drop old unique constraint on companyId if it exists
DROP INDEX IF EXISTS "WhopInstallation_companyId_key";

-- Step 4: Create composite unique constraint (companyId, userId)
CREATE UNIQUE INDEX IF NOT EXISTS "WhopInstallation_companyId_userId_key" 
ON "WhopInstallation"("companyId", "userId");

-- Step 5: Ensure UserPlan table exists
CREATE TABLE IF NOT EXISTS "UserPlan" (
    "userId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPlan_pkey" PRIMARY KEY ("userId")
);

-- Step 6: Migrate existing plan data to UserPlan table
-- For each unique userId, set their plan based on their installations
INSERT INTO "UserPlan" ("userId", "plan", "updatedAt", "createdAt")
SELECT DISTINCT ON ("userId")
    "userId",
    COALESCE(
        CASE 
            WHEN "plan" IN ('pro', 'professional') THEN 'pro'
            WHEN "plan" IN ('business', 'enterprise') THEN 'business'
            ELSE 'free'
        END,
        'free'
    ) as "plan",
    NOW() as "updatedAt",
    NOW() as "createdAt"
FROM "WhopInstallation"
WHERE "userId" IS NOT NULL
ON CONFLICT ("userId") DO UPDATE SET
    "plan" = EXCLUDED."plan",
    "updatedAt" = NOW();

-- Step 7: Ensure indexes exist
CREATE INDEX IF NOT EXISTS "WhopInstallation_userId_idx" ON "WhopInstallation"("userId");
CREATE INDEX IF NOT EXISTS "WhopInstallation_companyId_idx" ON "WhopInstallation"("companyId");

