/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getInstallationByExperience } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeButtonIframe } from '@/components/upgrade-button-iframe'
import { ErrorDisplay } from '@/components/error-boundary'
import { DashboardSettingsButton } from '@/components/dashboard-settings-button'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ExperienceNotFound } from '@/components/experience-not-found'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 10 // Fail fast if taking too long

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

  // If not found, quickly determine scenario and render client component
  if (!installation) {
    console.log('[Experience Page] No installation found for:', experienceId)
    
    // Try to get session info quickly (with timeout)
    let hasOtherInstallation = false
    let otherExperienceId: string | undefined
    
    try {
      const session = await Promise.race([
        getSession(token),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 2000))
      ]) as any
      
      console.log('[Experience Page] Session userId:', session?.userId || 'none')
      
      if (session?.userId) {
        // Quick check for other installations
        const userInstallations = await Promise.race([
          prisma.whopInstallation.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: 'desc' },
            take: 1,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000))
        ]) as any[]
        
        console.log('[Experience Page] Found', userInstallations.length, 'installations')
        
        if (userInstallations.length > 0) {
          hasOtherInstallation = true
          otherExperienceId = userInstallations[0].experienceId
        }
      }
    } catch (error) {
      console.error('[Experience Page] Quick check failed:', error)
      // Continue with defaults (hasOtherInstallation = false)
    }
    
    // Render client component immediately
    return (
      <ExperienceNotFound 
        experienceId={experienceId}
        hasOtherInstallation={hasOtherInstallation}
        otherExperienceId={otherExperienceId}
      />
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

