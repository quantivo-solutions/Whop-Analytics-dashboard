/**
 * Company-scoped dashboard page
 * Useful for direct links and support
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Settings } from 'lucide-react'
import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getInstallationByCompany } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeButton } from '@/components/upgrade-button'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: {
    companyId: string
  }
}

export default async function CompanyDashboardPage({ params }: PageProps) {
  const { companyId } = params

  // Fetch installation, dashboard data, and plan
  const [installation, dashboardData, plan] = await Promise.all([
    getInstallationByCompany(companyId),
    getCompanySeries(companyId, 30),
    getPlanForCompany(companyId),
  ])

  const upgradeUrl = getUpgradeUrl()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <PlanBadge plan={plan} />
          </div>
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

        {/* Info if no installation (test/demo company) */}
        {!installation && !companyId.includes('demo') && (
          <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="pt-6">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                ℹ️ Test company - showing historical data from database.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dashboard view */}
        <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />

        {/* Company info (for debugging/support) */}
        <div className="mt-8 text-xs text-muted-foreground text-center">
          Company ID: {companyId}
          {installation && (
            <>
              {installation.experienceId && ` • Experience: ${installation.experienceId}`}
              {installation.plan && ` • Plan: ${installation.plan}`}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

