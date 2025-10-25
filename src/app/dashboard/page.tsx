import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { DashboardView } from "@/components/dashboard-view"
import { getCompanySeries } from "@/lib/metrics"
import { getPlanForCompany, getUpgradeUrl } from "@/lib/plan"
import { PlanBadge } from "@/components/plan-badge"
import { UpgradeButton } from "@/components/upgrade-button"
import { prisma } from "@/lib/prisma"

// Disable caching for this page to ensure Whop badge updates
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  // Use the first available company (demo or real installation)
  const whopInstallation = await prisma.whopInstallation.findFirst()
  const companyId = whopInstallation?.companyId || 'demo_company'

  // Fetch dashboard data and plan using shared helpers
  const [dashboardData, plan] = await Promise.all([
    getCompanySeries(companyId, 30),
    getPlanForCompany(companyId),
  ])

  const upgradeUrl = getUpgradeUrl()
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header with plan badge and actions */}
        <div className="mb-4 flex items-center justify-between">
          <PlanBadge plan={plan} />
          <div className="flex items-center gap-2">
            {plan === 'free' && <UpgradeButton upgradeUrl={upgradeUrl} size="sm" variant="outline" />}
            <Link href="/settings">
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        </div>

        {/* Dashboard view */}
        <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />

        {/* Company info footer */}
        <div className="mt-8 text-xs text-muted-foreground text-center">
          Viewing: {companyId}
          {whopInstallation?.plan && ` • Plan: ${whopInstallation.plan}`}
        </div>
      </div>
    </div>
  )
}
