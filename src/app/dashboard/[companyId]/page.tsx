/**
 * Company-scoped dashboard page
 * PROTECTED: Requires authentication token or Whop iframe context
 * 
 * Access methods:
 * 1. Via secret token: ?token=CRON_SECRET
 * 2. Via Whop iframe embedding (for experiences)
 * 3. Demo companies (public)
 * 4. Development mode (all access allowed)
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Settings, Lock } from 'lucide-react'
import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getInstallationByCompany } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeButton } from '@/components/upgrade-button'
import { canAccessCompany } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: {
    companyId: string
  }
  searchParams: {
    token?: string
  }
}

export default async function CompanyDashboardPage({ params, searchParams }: PageProps) {
  const { companyId } = params
  const { token } = searchParams

  // 🔒 SECURITY CHECK: Verify user has permission to access this company's data
  const accessCheck = await canAccessCompany(companyId, token)
  
  if (!accessCheck.allowed) {
    // User is not authorized - show access denied page
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="rounded-full bg-red-100 dark:bg-red-950 p-3 w-12 h-12 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold">Access Denied</h2>
            <p className="text-muted-foreground">
              You don't have permission to view this company's dashboard.
            </p>
            <p className="text-sm text-muted-foreground">
              Company ID: <code className="text-xs bg-muted px-2 py-1 rounded">{companyId}</code>
            </p>
            <div className="pt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                If you own this company, access your dashboard via:
              </p>
              <ul className="text-xs text-muted-foreground text-left list-disc list-inside space-y-1">
                <li>Your Whop experience page (embedded view)</li>
                <li>The main <Link href="/dashboard" className="text-primary hover:underline">dashboard</Link></li>
              </ul>
            </div>
            <div className="pt-4">
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is authorized - fetch and display data
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
          {accessCheck.reason && (
            <span className="block mt-2 text-green-600 dark:text-green-400">
              🔒 Secure access via: {accessCheck.reason.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

