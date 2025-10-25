-- Drop old WhopAccount table if it exists
DROP TABLE IF EXISTS "WhopAccount" CASCADE;

-- CreateTable (WhopInstallation)
CREATE TABLE IF NOT EXISTS "WhopInstallation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "plan" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhopInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "WhopInstallation_companyId_key" ON "WhopInstallation"("companyId");

-- Ensure WorkspaceSettings table exists (in case it was dropped)
CREATE TABLE IF NOT EXISTS "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "reportEmail" TEXT NOT NULL,
    "weeklyEmail" BOOLEAN NOT NULL DEFAULT true,
    "dailyEmail" BOOLEAN NOT NULL DEFAULT false,
    "discordWebhook" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- Ensure MetricsDaily table exists
CREATE TABLE IF NOT EXISTS "MetricsDaily" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "grossRevenue" DOUBLE PRECISION NOT NULL,
    "activeMembers" INTEGER NOT NULL,
    "newMembers" INTEGER NOT NULL,
    "cancellations" INTEGER NOT NULL,
    "trialsStarted" INTEGER NOT NULL,
    "trialsPaid" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MetricsDaily_date_key" ON "MetricsDaily"("date");

