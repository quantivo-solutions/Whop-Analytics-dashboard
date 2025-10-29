/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getInstallationByExperience } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeButtonIframe } from '@/components/upgrade-button-iframe'
import { ErrorDisplay } from '@/components/error-boundary'
import { DashboardSettingsButton } from '@/components/dashboard-settings-button'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{
    experienceId: string
  }>
  searchParams: Promise<{
    token?: string
  }>
}

export default async function ExperienceDashboardPage({ params, searchParams }: PageProps) {
  const { experienceId } = await params
  const { token } = await searchParams

  try {
    // Look up installation by experienceId
    const installation = await getInstallationByExperience(experienceId)

  // If not found, check if this is the Pro membership Whop or a new installation
  if (!installation) {
    console.log('[Experience Page] No installation found for:', experienceId)
    
    // Check if user has a session and other installations (Pro membership Whop scenario)
    const session = await getSession(token)
    console.log('[Experience Page] Session userId:', session?.userId || 'none')
    
    let userInstallations: any[] = []
    
    // If user is logged in, check if they have installations elsewhere
    if (session?.userId) {
      userInstallations = await prisma.whopInstallation.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      })
      
      console.log('[Experience Page] Found', userInstallations.length, 'installations for user')
    }
    
    // Show a universal "not available here" message for this experience
    // This handles both logged-in Pro users AND new visitors
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-4 w-16 h-16 mx-auto flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Analytics Dashboard Not Available Here</h2>
              <p className="text-muted-foreground">
                {userInstallations.length > 0 
                  ? "You're viewing your Pro membership management page."
                  : "This app is not installed in this Whop."}
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg text-left space-y-3">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                💡 How the Analytics Dashboard works:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-disc list-inside">
                <li>The dashboard is installed in <strong>your company's Whop</strong></li>
                {userInstallations.length > 0 && (
                  <li>This page is for <strong>Pro membership management</strong></li>
                )}
                <li>To access your analytics, switch to where the app is installed</li>
              </ul>
            </div>

            {userInstallations.length > 0 && userInstallations[0].experienceId && (
              <Link href={`/experiences/${userInstallations[0].experienceId}`}>
                <Button className="gap-2 w-full" size="lg">
                  Go to Your Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}

            <div className="pt-4 border-t space-y-3">
              <p className="text-sm text-muted-foreground">
                <strong>To access the Analytics Dashboard:</strong>
              </p>
              <ol className="text-sm text-muted-foreground text-left space-y-2 list-decimal list-inside">
                <li>Look for <strong>your company's Whop</strong> in the sidebar</li>
                <li>Click on it to switch Whops</li>
                <li>You'll see your Analytics Dashboard there! 🎉</li>
              </ol>
            </div>

            <div className="pt-4">
              <p className="text-xs text-muted-foreground">
                Experience ID: <code className="text-xs bg-muted px-2 py-1 rounded">{experienceId}</code>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

    // Fetch dashboard data and plan for this company
    const [dashboardData, plan] = await Promise.all([
      getCompanySeries(installation.companyId, 30),
      getPlanForCompany(installation.companyId),
    ])

    // Get upgrade URL with company context for better Whop integration
    const upgradeUrl = getUpgradeUrl(installation.companyId)

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-6 max-w-7xl">
          {/* Professional Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Analytics Dashboard
                </h1>
                <p className="text-muted-foreground mt-2 text-lg">
                  Real-time insights into your Whop business performance
                </p>
              </div>
              <div className="flex items-center gap-3">
                <PlanBadge plan={plan} />
                <UpgradeButtonIframe plan={plan} experienceId={experienceId} />
                <DashboardSettingsButton companyId={installation.companyId} />
              </div>
            </div>
            
            {/* Plan benefits banner for free users */}
            {plan === 'free' && (
              <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">🚀 Unlock more with Pro:</span>
                  {' '}Daily email reports, Discord alerts, extended analytics history, and priority support
                </p>
              </div>
            )}
            
            {/* Pro membership explanation banner */}
            {plan === 'pro' && (
              <div className="mt-4 p-4 rounded-lg border border-green-500/20 bg-green-500/5">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">💡 Pro Tip:</span>
                  {' '}If you see "Quantivo Solutions" in your sidebar, that's your Pro membership portal. Your Analytics Dashboard is here in your company's Whop.
                </p>
              </div>
            )}
          </div>

          {/* Dashboard view */}
          <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />

          {/* Subtle footer with installation info */}
          <div className="mt-12 pt-6 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              Connected to {installation.companyId}
              {installation.experienceId && ` • Experience: ${installation.experienceId}`}
            </p>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    // Log error for debugging
    console.error('Error loading experience dashboard:', error)
    
    // Show user-friendly error message
    return (
      <ErrorDisplay
        title="Unable to Load Experience"
        message="We're having trouble loading this experience dashboard. Please try again or contact support if the issue persists."
        showRefreshButton={true}
        showHomeButton={true}
      />
    )
  }
}

