/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, Settings } from 'lucide-react'
import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getInstallationByExperience } from '@/lib/metrics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: {
    experienceId: string
  }
}

export default async function ExperienceDashboardPage({ params }: PageProps) {
  const { experienceId } = params

  // Look up installation by experienceId
  const installation = await getInstallationByExperience(experienceId)

  // If not found, show friendly message
  if (!installation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="rounded-full bg-muted p-3 w-12 h-12 mx-auto flex items-center justify-center">
              <Settings className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Installation Not Found</h2>
            <p className="text-muted-foreground">
              We couldn't find an installation for experience ID: <code className="text-xs bg-muted px-2 py-1 rounded">{experienceId}</code>
            </p>
            <p className="text-sm text-muted-foreground">
              This might mean the app hasn't been installed yet, or the installation was removed.
            </p>
            <Link href="/discover">
              <Button className="gap-2">
                Install App <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch dashboard data for this company
  const dashboardData = await getCompanySeries(installation.companyId, 30)

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

        {/* Installation info (for debugging/support) */}
        <div className="mt-8 text-xs text-muted-foreground text-center">
          Experience: {installation.experienceId} • Company: {installation.companyId}
          {installation.plan && ` • Plan: ${installation.plan}`}
        </div>
      </div>
    </div>
  )
}

