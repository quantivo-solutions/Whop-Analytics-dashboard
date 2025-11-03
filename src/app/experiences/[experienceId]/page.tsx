/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getInstallationByExperience } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { getCompanyPrefs, isOnboardingComplete } from '@/lib/company'
import { UpgradeButtonIframe } from '@/components/upgrade-button-iframe'
import { ErrorDisplay } from '@/components/error-boundary'
import { UserProfileMenuClient } from '@/components/user-profile-menu-client'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { ExperienceNotFound } from '@/components/experience-not-found'
import { redirect } from 'next/navigation'
import { TokenCleanup } from '@/components/token-cleanup'
import { SessionSetter } from '@/components/session-setter'
import { verifyWhopUserToken, isWhopIframe } from '@/lib/whop-auth'
import { WizardWrapper } from '@/components/onboarding/WizardWrapper'
import { InsightsPanel } from '@/components/insights/InsightsPanel'

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

  // STEP 1: ALWAYS check Whop iframe authentication FIRST (before checking installation)
  // This is what other Whop apps do - they auto-login users already authenticated in Whop
  console.log('[Experience Page] Step 1: Checking Whop iframe authentication...')
  const whopUser = await verifyWhopUserToken()
  
  let installation = null
  let companyId: string | null = null
  
  // If user is authenticated via Whop headers, we can auto-create installation
  if (whopUser && whopUser.userId) {
    console.log('[Experience Page] ✅ Whop user authenticated via iframe headers:', whopUser.userId)
    
    let companyId: string | null = null
    
    // Try to get companyId from experience API
    console.log('[Experience Page] Fetching experience data from Whop API to get companyId...')
    const { env } = await import('@/lib/env')
    
    try {
      const expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
        headers: {
          'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
        },
      })
      
      if (expResponse.ok) {
        const expData = await expResponse.json()
        companyId = expData.company?.id || expData.company_id || null
        
        if (companyId) {
          console.log('[Experience Page] Got companyId from experience:', companyId)
        } else {
          console.log('[Experience Page] ⚠️ Experience data missing companyId')
        }
      } else {
        console.log('[Experience Page] Experience API returned:', expResponse.status, '- will use fallback')
      }
    } catch (expError) {
      console.error('[Experience Page] Error fetching experience data:', expError)
    }
    
    // Fallback: Use user's companyId or userId as companyId
    // This matches the OAuth callback behavior when experience API fails
    if (!companyId) {
      companyId = whopUser.companyId || whopUser.userId
      console.log('[Experience Page] Using fallback companyId:', companyId, '(from Whop user token)')
    }
    
    // PRIORITY 1: Find by experienceId first (most reliable - matches this specific experience)
    // This ensures we get the correct installation for this experience, even if user has multiple
    if (experienceId) {
      console.log('[Experience Page] Looking up installation by experienceId first (most reliable)...')
      installation = await prisma.whopInstallation.findUnique({
        where: { experienceId },
      })
      
      if (installation) {
        console.log('[Experience Page] ✅ Found installation by experienceId:', installation.companyId, 'plan:', installation.plan)
        companyId = installation.companyId
        // Update userId if needed (for webhook matching)
        if (installation.userId !== whopUser.userId) {
          await prisma.whopInstallation.update({
            where: { experienceId },
            data: { userId: whopUser.userId, username: whopUser.username || installation.username },
          })
        }
      }
    }
    
    // PRIORITY 2: If not found by experienceId, try by companyId (from experience API or fallback)
    if (!installation && companyId) {
      console.log('[Experience Page] Looking up installation by companyId:', companyId)
      
      try {
        installation = await prisma.whopInstallation.findUnique({
          where: { companyId },
        })
        
        if (installation) {
          console.log('[Experience Page] ✅ Found installation by companyId:', companyId, 'plan:', installation.plan)
          // Update experienceId if it changed or was missing
          if (installation.experienceId !== experienceId && experienceId) {
            console.log('[Experience Page] Updating installation experienceId to match current:', experienceId)
            installation = await prisma.whopInstallation.update({
              where: { companyId },
              data: { experienceId, userId: whopUser.userId, username: whopUser.username || installation.username },
            })
          }
        }
      } catch (dbError) {
        console.error('[Experience Page] Error finding installation by companyId:', dbError)
      }
    }
    
    // PRIORITY 3: If still not found, try by userId (find most recent that matches experienceId if possible)
    if (!installation) {
      console.log('[Experience Page] Looking for installation by userId...')
      const userInstallations = await prisma.whopInstallation.findMany({
        where: { userId: whopUser.userId },
        orderBy: { updatedAt: 'desc' }, // Most recently updated (likely just upgraded)
      })
      
      if (userInstallations.length > 0) {
        // If experienceId is known, prefer installation that matches it
        let preferredInstallation = null
        if (experienceId) {
          preferredInstallation = userInstallations.find(inst => inst.experienceId === experienceId)
        }
        
        // Use preferred one if found, otherwise use most recent
        installation = preferredInstallation || userInstallations[0]
        console.log('[Experience Page] ✅ Found installation by userId:', installation.companyId, 'plan:', installation.plan, 
                    preferredInstallation ? '(matched experienceId)' : '(most recent)')
        
        // Update experienceId to match current experience if different
        if (installation.experienceId !== experienceId && experienceId) {
          console.log('[Experience Page] Updating installation experienceId to match current:', experienceId)
          installation = await prisma.whopInstallation.update({
            where: { companyId: installation.companyId },
            data: { experienceId },
          })
        }
        companyId = installation.companyId // Use the correct companyId
      }
    }
    
    // Create installation if still not found
    if (!installation && companyId) {
      console.log('[Experience Page] No installation found, creating one automatically from Whop auth...')
      
      try {
        installation = await prisma.whopInstallation.create({
          data: {
            companyId,
            userId: whopUser.userId,
            experienceId,
            accessToken: env.WHOP_APP_SERVER_KEY, // Use app server key for now
            plan: 'free', // Default, will be synced later
            username: whopUser.username || null,
          },
        })
        console.log('[Experience Page] ✅ Created installation automatically:', companyId)
      } catch (dbError) {
        console.error('[Experience Page] Error creating installation:', dbError)
      }
    }
    
    if (!companyId) {
      console.log('[Experience Page] ⚠️ Could not determine companyId - will try experienceId lookup')
    }
  } else {
    console.log('[Experience Page] No Whop user token found in headers')
  }
  
  // STEP 2: Look up installation by experienceId (if not already found/created above)
  if (!installation) {
    console.log('[Experience Page] Step 2: Looking up installation by experienceId...')
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
  }

  // STEP 3: If still no installation, check for other installations and auto-redirect
  if (!installation) {
    console.log('[Experience Page] No installation found for experienceId:', experienceId)
    
    // Check if user has any other installations (might be a different experienceId)
    if (whopUser && whopUser.userId) {
      const userInstallations = await prisma.whopInstallation.findMany({
        where: { userId: whopUser.userId },
      })
      
      if (userInstallations.length > 0) {
        // User has installations, but not for this experienceId
        // Prefer company-based installations (biz_*)
        const companyBasedInstallations = userInstallations.filter(inst => inst.companyId.startsWith('biz_'))
        const installationsToCheck = companyBasedInstallations.length > 0 ? companyBasedInstallations : userInstallations
        
        // Find the most recent one with an experienceId
        const mostRecentInstallation = installationsToCheck
          .filter(inst => inst.experienceId) // Only ones with experienceId
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
        
        if (mostRecentInstallation?.experienceId) {
          console.log('[Experience Page] Found other installation, auto-redirecting to:', mostRecentInstallation.experienceId)
          redirect(`/experiences/${mostRecentInstallation.experienceId}`)
        }
      }
    }
    
    console.log('[Experience Page] No installation found and no Whop auth - redirecting to login')
    console.log('[Experience Page] This is expected for new installations - elapsed:', Date.now() - startTime, 'ms')
    
    return (
      <ExperienceNotFound 
        experienceId={experienceId}
        hasOtherInstallation={false}
        otherExperienceId={undefined}
      />
    )
  }

  // CRITICAL: Verify the installation matches the current experienceId
  // After reinstall, a new experienceId is generated, so old installations shouldn't match
  // BUT: If installation was found by userId (most recent), it may have different experienceId
  // In that case, update it to match current experience
  if (installation.experienceId && installation.experienceId !== experienceId) {
    console.log('[Experience Page] Installation experienceId mismatch!')
    console.log('[Experience Page] Installation has:', installation.experienceId)
    console.log('[Experience Page] Current experienceId:', experienceId)
    console.log('[Experience Page] Updating installation to match current experience...')
    
    // Update installation to match current experienceId (user may have reinstalled)
    installation = await prisma.whopInstallation.update({
      where: { companyId: installation.companyId },
      data: { experienceId },
    })
    console.log('[Experience Page] ✅ Updated installation experienceId to:', experienceId)
  }

  // STEP 4: Refresh installation from DB to get latest plan (webhook may have updated it)
  // Also check if user has another installation with pro plan that should be used instead
  console.log('[Experience Page] Refreshing installation from database to get latest plan...')
  
  // First, check if user has any installation with pro plan (webhook might have updated a different one)
  if (whopUser && whopUser.userId) {
    const userInstallations = await prisma.whopInstallation.findMany({
      where: { userId: whopUser.userId },
    })
    
    // Find installation with pro plan (most recently updated)
    const proInstallation = userInstallations
      .filter(inst => inst.plan === 'pro' || inst.plan === 'business')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    
    // If we found a pro installation, use it if current installation is free
    if (proInstallation && installation.plan === 'free') {
      console.log('[Experience Page] ⚠️ Found pro installation for user:', proInstallation.companyId, 'switching to it')
      // Update the pro installation's experienceId to match current experience
      if (proInstallation.experienceId !== experienceId) {
        await prisma.whopInstallation.update({
          where: { companyId: proInstallation.companyId },
          data: { experienceId },
        })
      }
      installation = proInstallation
      companyId = proInstallation.companyId
      console.log('[Experience Page] ✅ Using pro installation:', companyId)
    } else {
      // Refresh current installation
      const freshInstallation = await prisma.whopInstallation.findUnique({
        where: { companyId: installation.companyId },
      })
      if (freshInstallation) {
        installation = freshInstallation
        console.log('[Experience Page] ✅ Installation refreshed, plan:', installation.plan)
      }
    }
  } else {
    // No Whop user, just refresh
    const freshInstallation = await prisma.whopInstallation.findUnique({
      where: { companyId: installation.companyId },
    })
    if (freshInstallation) {
      installation = freshInstallation
      console.log('[Experience Page] ✅ Installation refreshed, plan:', installation.plan)
    }
  }
  
  // STEP 5: Check for session and create one if we have Whop auth
  console.log('[Experience Page] Installation found and matches experienceId, checking session...')
  
  let session = await getSession(token).catch(() => null)
  
  // If we have Whop user auth but no session, create session token for immediate use
  // We can't set cookies in Server Components, so we'll use the token directly
  if (!session && whopUser && whopUser.userId) {
    console.log('[Experience Page] ✅ Whop user authenticated via iframe headers, creating session token...')
    
    // Verify user matches installation
    const userMatchesInstallation = 
      installation.userId === whopUser.userId || 
      installation.companyId === whopUser.userId ||
      installation.companyId === whopUser.companyId
    
    if (userMatchesInstallation) {
      // Create session token directly (we'll set cookie via API route on client side)
      const sessionToken = Buffer.from(JSON.stringify({
        companyId: installation.companyId,
        userId: whopUser.userId,
        username: whopUser.username || installation.username,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
      })).toString('base64')
      
      // Use the token as session data for this request
      session = {
        companyId: installation.companyId,
        userId: whopUser.userId,
        username: whopUser.username || installation.username || undefined,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000),
      }
      
      console.log('[Experience Page] ✅ Session token created - user auto-logged in')
      
      // Store token to pass to SessionSetter component
      // This will be passed as a prop to set the cookie via API route
      ;(global as any).__whopSessionToken = sessionToken
    } else {
      console.log('[Experience Page] ⚠️ Whop user does not match installation:', {
        whopUserId: whopUser.userId,
        installationUserId: installation.userId,
        installationCompanyId: installation.companyId
      })
      console.log('[Experience Page] Will check for existing session or redirect to login')
    }
  }
  
  // Step 2: Fall back to token-based auth (for post-OAuth redirects)
  if (!session && token) {
    console.log('[Experience Page] Token provided but session not found via cookie yet')
    console.log('[Experience Page] This might be immediate post-OAuth redirect - trying token directly...')
    
    // Try to parse token directly
    try {
      const sessionData = JSON.parse(Buffer.from(token, 'base64').toString())
      if (sessionData.exp && sessionData.exp > Date.now()) {
        console.log('[Experience Page] Token is valid - using it for this request')
        session = sessionData
      } else {
        console.log('[Experience Page] Token expired')
      }
    } catch (tokenError) {
      console.error('[Experience Page] Failed to parse token:', tokenError)
    }
  }
  
  // Step 3: If still no session, redirect to login
  if (!session) {
    console.log('[Experience Page] No valid session found - redirecting to login')
    console.log('[Experience Page] Installation exists but requires authentication')
    redirect(`/login?experienceId=${experienceId}`)
  }
  
  console.log('[Experience Page] Valid session found, loading dashboard - elapsed:', Date.now() - startTime, 'ms')
  
  // Proceed to load dashboard with error handling
  try {
    // CRITICAL: Use installation.companyId (not session.companyId) to ensure we get the correct plan
    const finalCompanyId = installation.companyId
    
    console.log('[Experience Page] Installation details:', {
      companyId: finalCompanyId,
      plan: installation.plan,
      userId: installation.userId,
      username: installation.username
    })

    // CRITICAL: Check onboarding status FIRST before fetching dashboard data
    // This ensures wizard shows immediately on first install
    const prefs = await getCompanyPrefs(finalCompanyId)
    const onboardingComplete = await isOnboardingComplete(finalCompanyId)
    
    console.log('[Experience Page] Onboarding status:', {
      completedAt: prefs.completedAt,
      isComplete: onboardingComplete
    })

    // BLOCK dashboard access until onboarding is complete
    if (!onboardingComplete) {
      const sessionTokenForClient = (global as any).__whopSessionToken
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
          <TokenCleanup />
          <WizardWrapper
            companyId={finalCompanyId}
            initialPrefs={{
              goalAmount: prefs.goalAmount ? Number(prefs.goalAmount) : null,
              completedAt: prefs.completedAt?.toISOString() || null,
            }}
          />
        </div>
      )
    }

    // Fetch dashboard data and plan with error handling (only after onboarding check)
    console.log('[Experience Page] Onboarding complete, fetching dashboard data for companyId:', finalCompanyId)
           
           let dashboardData, plan
           try {
             // Use installation.plan directly (most up-to-date from webhooks, already refreshed in STEP 4)
             plan = installation.plan || 'free'
             
             // Fetch dashboard data
             dashboardData = await getCompanySeries(finalCompanyId, 30)
             
             console.log('[Experience Page] Dashboard data fetched successfully, plan:', plan)
    } catch (fetchError) {
      console.error('[Experience Page] Failed to fetch dashboard data:', fetchError)
      throw fetchError
    }

           // Get upgrade URL with company context for better Whop integration
           const upgradeUrl = getUpgradeUrl(finalCompanyId)

    const goalAmount = prefs.goalAmount ? Number(prefs.goalAmount) : null
    const currentRevenue = dashboardData.kpis.grossRevenue
    const goalProgress = goalAmount ? (currentRevenue / goalAmount) * 100 : null
    const goalRemaining = goalAmount ? Math.max(0, goalAmount - currentRevenue) : null

    // Dashboard content with new UI
    // SessionSetter will set cookie via API route if we have Whop auth session
    // TokenCleanup will remove token from URL after session is confirmed
    const sessionTokenForClient = (global as any).__whopSessionToken
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
        <TokenCleanup />

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
                      {goalAmount ? (
                        <>
                          Goal: ${goalAmount.toLocaleString()} — {goalRemaining && goalRemaining > 0 ? (
                            <>${goalRemaining.toLocaleString()} away</>
                          ) : (
                            <>Goal reached! 🎉</>
                          )}
                        </>
                      ) : (
                        <>Business insights at a glance</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Actions */}
              <div className="flex items-center gap-2">
                <UpgradeButtonIframe plan={plan} experienceId={experienceId} />
                <UserProfileMenuClient
                  companyId={finalCompanyId}
                  username={installation.username}
                  email={installation.email}
                  profilePicUrl={installation.profilePicUrl}
                  plan={plan}
                  prefs={{
                    goalAmount: prefs.goalAmount ? Number(prefs.goalAmount) : null,
                    completedAt: prefs.completedAt?.toISOString() || null,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Dashboard view */}
          <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />

          {/* Insights Panel */}
          <div className="mt-8">
            <InsightsPanel data={dashboardData} plan={plan} goalAmount={goalAmount} />
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

