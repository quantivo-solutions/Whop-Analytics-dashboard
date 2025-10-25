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

  // Check if installation exists
  const installation = await getInstallationByCompany(companyId)

  // Fetch dashboard data (even if no installation, show what data we have)
  const dashboardData = await getCompanySeries(companyId, 30)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Navigation */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Main Dashboard
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Warning if no installation */}
        {!installation && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ No active installation found for this company. Data shown is from the database only.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dashboard view */}
        <DashboardView data={dashboardData} showBadge={true} />

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

