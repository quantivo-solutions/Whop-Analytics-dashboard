/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getInstallationByExperience } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { UpgradeButtonIframe } from '@/components/upgrade-button-iframe'
import { ErrorDisplay } from '@/components/error-boundary'
import { UserProfileMenuClient } from '@/components/user-profile-menu-client'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ExperienceNotFound } from '@/components/experience-not-found'
import { redirect } from 'next/navigation'
import { SessionRefresher } from '@/components/session-refresher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 5 // Fail fast

interface PageProps {
  params: Promise<{
    experienceId: string
  }>
  searchParams: Promise<{
    token?: string
    loggedOut?: string
  }>
}

export default async function ExperienceDashboardPage({ params, searchParams }: PageProps) {
  const startTime = Date.now()
  const { experienceId } = await params
  const resolvedSearchParams = await searchParams
  const { token, loggedOut } = resolvedSearchParams
  const isLoggedOut = loggedOut === 'true'

  console.log('[Experience Page] START - experienceId:', experienceId, 'token:', token ? 'present' : 'none', 'loggedOut:', isLoggedOut)

  // Look up installation by experienceId with retry logic
  console.log('[Experience Page] Looking up installation...')
  let installation = null
  let retries = 0
  const maxRetries = 3
  
  while (!installation && retries < maxRetries) {
    if (retries > 0) {
      console.log(`[Experience Page] Retry ${retries}/${maxRetries} - waiting 500ms...`)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    installation = await Promise.race([
      getInstallationByExperience(experienceId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Installation lookup timeout')), 3000))
    ]).catch(err => {
      console.error(`[Experience Page] Installation lookup attempt ${retries + 1} failed:`, err.message)
      return null
    }) as any
    
    retries++
  }
  
  if (installation) {
    console.log(`[Experience Page] Installation found after ${retries} attempt(s)`)
  } else {
    console.log(`[Experience Page] Installation not found after ${retries} attempts`)
  }

  // If not found, quickly determine scenario and render client component
  // This is NOT an error - it's expected for new installations
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
    
    // Render client component immediately - this will auto-redirect to login
    console.log('[Experience Page] Rendering ExperienceNotFound - hasOther:', hasOtherInstallation, 'elapsed:', Date.now() - startTime, 'ms')
    return (
      <ExperienceNotFound 
        experienceId={experienceId}
        hasOtherInstallation={hasOtherInstallation}
        otherExperienceId={otherExperienceId}
      />
    )
  }

  // Installation found - check for session, but allow access if installation exists (iframe context)
  console.log('[Experience Page] Installation found, checking session...')
  let session = await getSession(token).catch(() => null)
  
  // If no session but installation exists, we're in iframe context where cookies might be blocked
  // Allow auto-login to restore cookie access, BUT check for explicit logout first
  let needsSessionRefresh = false
  if (!session) {
    // Check if there's a "loggedOut" query param (set during logout redirect)
    // If present, don't auto-login - user explicitly logged out
    if (isLoggedOut) {
      console.log('[Experience Page] Logout flag detected - redirecting to login')
      redirect(`/login?experienceId=${experienceId}`)
    }
    
    // No logout flag - allow auto-login (cookie not readable, likely iframe issue)
    console.log('[Experience Page] No session found, but installation exists - allowing iframe access')
    // Create temporary session from installation data for this request
    session = {
      companyId: installation.companyId,
      userId: installation.userId || installation.companyId,
      username: installation.username,
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
    }
    needsSessionRefresh = true
    console.log('[Experience Page] Created temporary session from installation - will refresh cookie via client')
  } else {
    console.log('[Experience Page] Session found, loading dashboard - elapsed:', Date.now() - startTime, 'ms')
  }
  
  // Proceed to load dashboard with error handling
  try {
    console.log('[Experience Page] Installation details:', {
      companyId: installation.companyId,
      plan: installation.plan,
      userId: installation.userId,
      username: installation.username
    })

    // Fetch dashboard data and plan with error handling
    console.log('[Experience Page] Fetching dashboard data for companyId:', installation.companyId)
    
    let dashboardData, plan
    try {
      [dashboardData, plan] = await Promise.all([
        getCompanySeries(installation.companyId, 30),
        getPlanForCompany(installation.companyId),
      ])
      console.log('[Experience Page] Dashboard data fetched successfully, plan:', plan)
    } catch (fetchError) {
      console.error('[Experience Page] Failed to fetch dashboard data:', fetchError)
      throw fetchError
    }

    // Get upgrade URL with company context for better Whop integration
    const upgradeUrl = getUpgradeUrl(installation.companyId)

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Refresh session cookie if needed (for iframe cookie issues) */}
        {needsSessionRefresh && (
          <SessionRefresher
            companyId={installation.companyId}
            userId={installation.userId}
            username={installation.username}
          />
        )}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
          {/* Elegant Compact Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left: Branding */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
                    <p className="text-xs text-muted-foreground hidden sm:block">Business insights at a glance</p>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <UpgradeButtonIframe plan={plan} experienceId={experienceId} />
                <UserProfileMenuClient 
                  companyId={installation.companyId}
                  username={installation.username}
                  email={installation.email}
                  profilePicUrl={installation.profilePicUrl}
                  plan={plan}
                />
              </div>
            </div>
          </div>

          {/* Dashboard view */}
          <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />
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

