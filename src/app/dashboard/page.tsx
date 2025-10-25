import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { DashboardView } from "@/components/dashboard-view"
import { getCompanySeries } from "@/lib/metrics"
import { prisma } from "@/lib/prisma"

// Disable caching for this page to ensure Whop badge updates
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  // Use the first available company (demo or real installation)
  const whopInstallation = await prisma.whopInstallation.findFirst()
  const companyId = whopInstallation?.companyId || 'demo_company'

  // Fetch dashboard data using shared helper
  const dashboardData = await getCompanySeries(companyId, 30)
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Settings link */}
        <div className="mb-4 flex justify-end">
          <Link href="/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Dashboard view */}
        <DashboardView data={dashboardData} showBadge={true} />

        {/* Company info footer */}
        <div className="mt-8 text-xs text-muted-foreground text-center">
          Viewing: {companyId}
          {whopInstallation?.plan && ` • Plan: ${whopInstallation.plan}`}
        </div>
      </div>
    </div>
  )
}
