/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getInstallationByExperience } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { UpgradeButtonIframe } from '@/components/upgrade-button-iframe'
import { ErrorDisplay } from '@/components/error-boundary'
import { UserProfileMenu } from '@/components/user-profile-menu'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ExperienceNotFound } from '@/components/experience-not-found'

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
  const { token } = await searchParams

  console.log('[Experience Page] START - experienceId:', experienceId, 'token:', token ? 'present' : 'none')

  try {
    // Look up installation by experienceId with timeout
    console.log('[Experience Page] Looking up installation...')
    const installation = await Promise.race([
      getInstallationByExperience(experienceId),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Installation lookup timeout')), 3000))
    ]).catch(err => {
      console.error('[Experience Page] Installation lookup failed:', err.message)
      return null
    }) as any

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
    console.log('[Experience Page] Rendering ExperienceNotFound - hasOther:', hasOtherInstallation, 'elapsed:', Date.now() - startTime, 'ms')
    return (
      <ExperienceNotFound 
        experienceId={experienceId}
        hasOtherInstallation={hasOtherInstallation}
        otherExperienceId={otherExperienceId}
      />
    )
  }

  console.log('[Experience Page] Installation found, loading dashboard - elapsed:', Date.now() - startTime, 'ms')

    // Fetch dashboard data, plan, and user info
    const [dashboardData, plan] = await Promise.all([
      getCompanySeries(installation.companyId, 30),
      getPlanForCompany(installation.companyId),
    ])

    // Try to get company data
    let companyData = null
    try {
      console.log('[Experience Page] Fetching company data...')
      const companyResponse = await fetch('https://api.whop.com/api/v5/company', {
        headers: {
          'Authorization': `Bearer ${installation.accessToken}`,
        },
      })
      
      console.log('[Experience Page] Company response status:', companyResponse.status)
      
      if (companyResponse.ok) {
        const rawData = await companyResponse.json()
        console.log('[Experience Page] Raw company data:', JSON.stringify(rawData).substring(0, 500))
        
        // Handle both direct object and data wrapper
        companyData = rawData.data || rawData
        
        console.log('[Experience Page] Parsed company data:', {
          id: companyData?.id,
          title: companyData?.title,
          name: companyData?.name,
          image_url: companyData?.image_url ? 'present' : 'missing',
        })
      } else {
        const errorText = await companyResponse.text()
        console.error('[Experience Page] Company fetch failed:', companyResponse.status, errorText)
      }
    } catch (error) {
      console.error('[Experience Page] Failed to fetch company data:', error)
    }

    // Get upgrade URL with company context for better Whop integration
    const upgradeUrl = getUpgradeUrl(installation.companyId)

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
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
                <UserProfileMenu 
                  companyId={installation.companyId}
                  username={companyData?.title || companyData?.name || 'My Business'}
                  profilePicture={companyData?.image_url}
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

