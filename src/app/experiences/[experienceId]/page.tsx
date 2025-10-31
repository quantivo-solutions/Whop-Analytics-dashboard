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
import { UrlCleanup } from '@/components/url-cleanup'
import { LogoutCheck } from '@/components/logout-check'

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
  }>
}

export default async function ExperienceDashboardPage({ params, searchParams }: PageProps) {
  const startTime = Date.now()
  const { experienceId } = await params
  const resolvedSearchParams = await searchParams
  const { token } = resolvedSearchParams

  console.log('[Experience Page] START - experienceId:', experienceId, 'token:', token ? 'present' : 'none')

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

  // If not found, this is a new installation - always redirect to login
  // Don't check for "other installations" here because:
  // 1. Fresh installs should always go to login first
  // 2. The OAuth callback will create the installation
  // 3. Checking for other installations can cause false positives (old installations for the same user)
  if (!installation) {
    console.log('[Experience Page] No installation found for:', experienceId, '- redirecting to login')
    console.log('[Experience Page] This is expected for new installations - elapsed:', Date.now() - startTime, 'ms')
    
    // Always redirect new installations to login - no need to check for other installations
    // The ExperienceNotFound component will handle the redirect
    return (
      <ExperienceNotFound 
        experienceId={experienceId}
        hasOtherInstallation={false}
        otherExperienceId={undefined}
      />
    )
  }

  // Installation found - check for session, but allow access if installation exists (iframe context)
  console.log('[Experience Page] Installation found, checking session...')
  let session = await getSession(token).catch(() => null)
  
  // If no session but installation exists, we're in iframe context where cookies might be blocked
  // Allow auto-login to restore cookie access, BUT check for explicit logout first
  // Note: We check sessionStorage on client-side, not URL params (to keep URL clean)
  let needsSessionRefresh = false
  let shouldShowLogin = false // Flag for client-side logout check
  
  if (!session) {
    // Logout flag is checked client-side via sessionStorage, not URL param
    // This keeps URLs clean while still preventing auto-login after explicit logout
    // We'll create a client component that checks sessionStorage BEFORE rendering dashboard
    console.log('[Experience Page] No session found, but installation exists - will check sessionStorage client-side')
    // Set flag to show login check component first
    shouldShowLogin = true
    // Create temporary session from installation data for this request
    // Client-side component will check sessionStorage and redirect if needed
    session = {
      companyId: installation.companyId,
      userId: installation.userId || installation.companyId,
      username: installation.username,
      exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days from now
    }
    needsSessionRefresh = true
    console.log('[Experience Page] Created temporary session from installation - client will check logout flag first')
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

    // If no session found, we need to check sessionStorage for logout flag BEFORE showing dashboard
    // This prevents auto-login after explicit logout
    // Wrap dashboard content in LogoutCheck component to verify user didn't explicitly logout
    const dashboardContent = (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Refresh session cookie if needed (for iframe cookie issues) */}
        {needsSessionRefresh && (
          <SessionRefresher
            companyId={installation.companyId}
            userId={installation.userId}
            username={installation.username}
          />
        )}
        <UrlCleanup />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
          {/* Elegant Compact Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left: Branding */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  {/* Whoplytics Logo - Glowing wave arrow */}
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 shadow-xl" />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-blue-600/20 to-transparent" />
                    <svg 
                      className="absolute inset-2 rounded-xl" 
                      viewBox="0 0 100 100" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Glowing wave line turning into arrow */}
                      <defs>
                        <linearGradient id="waveGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                          <stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
                          <stop offset="70%" stopColor="#22D3EE" stopOpacity="1" />
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity="1" />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      {/* Wave path */}
                      <path
                        d="M 15 50 Q 30 35, 45 50 T 65 50 L 75 45 L 80 40 L 85 30 L 85 25"
                        stroke="url(#waveGradient)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        filter="url(#glow)"
                      />
                      {/* Arrow head */}
                      <path
                        d="M 85 25 L 78 22 M 85 25 L 78 28"
                        stroke="url(#waveGradient)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        filter="url(#glow)"
                      />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      Whoplytics
                    </h1>
                    <p className="text-xs text-muted-foreground hidden sm:block font-medium">
                      Business insights at a glance
                    </p>
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

    // If no session, wrap content in LogoutCheck to verify logout flag
    if (shouldShowLogin) {
      return <LogoutCheck experienceId={experienceId}>{dashboardContent}</LogoutCheck>
    }

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
        <UrlCleanup />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
          {/* Elegant Compact Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left: Branding */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  {/* Whoplytics Logo - Glowing wave arrow */}
                  <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 shadow-xl" />
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-blue-600/20 to-transparent" />
                    <svg 
                      className="absolute inset-2 rounded-xl" 
                      viewBox="0 0 100 100" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      {/* Glowing wave line turning into arrow */}
                      <defs>
                        <linearGradient id="waveGradient2" x1="0%" y1="50%" x2="100%" y2="50%">
                          <stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
                          <stop offset="70%" stopColor="#22D3EE" stopOpacity="1" />
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity="1" />
                        </linearGradient>
                        <filter id="glow2">
                          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                          <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      {/* Wave path */}
                      <path
                        d="M 15 50 Q 30 35, 45 50 T 65 50 L 75 45 L 80 40 L 85 30 L 85 25"
                        stroke="url(#waveGradient2)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        filter="url(#glow2)"
                      />
                      {/* Arrow head */}
                      <path
                        d="M 85 25 L 78 22 M 85 25 L 78 28"
                        stroke="url(#waveGradient2)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        filter="url(#glow2)"
                      />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                      Whoplytics
                    </h1>
                    <p className="text-xs text-muted-foreground hidden sm:block font-medium">
                      Business insights at a glance
                    </p>
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

