-- CreateTable
CREATE TABLE "MetricsDaily" (
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

-- CreateTable
CREATE TABLE "WorkspaceSettings" (
    "id" TEXT NOT NULL,
    "reportEmail" TEXT NOT NULL,
    "weeklyEmail" BOOLEAN NOT NULL DEFAULT true,
    "dailyEmail" BOOLEAN NOT NULL DEFAULT false,
    "discordWebhook" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetricsDaily_date_key" ON "MetricsDaily"("date");
