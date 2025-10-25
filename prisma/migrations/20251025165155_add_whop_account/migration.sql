-- CreateTable
CREATE TABLE "WhopAccount" (
    "id" TEXT NOT NULL,
    "workspaceSettingsId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhopAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhopAccount_workspaceSettingsId_key" ON "WhopAccount"("workspaceSettingsId");

-- AddForeignKey
ALTER TABLE "WhopAccount" ADD CONSTRAINT "WhopAccount_workspaceSettingsId_fkey" FOREIGN KEY ("workspaceSettingsId") REFERENCES "WorkspaceSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
