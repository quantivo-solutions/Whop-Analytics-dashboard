/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries, getMonthlyRevenue } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { getCompanyPrefs, isOnboardingComplete, getInstallationByExperience } from '@/lib/company'
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
import { ProWelcomeWrapper } from '@/components/pro-welcome/ProWelcomeWrapper'
import { InsightsPanel } from '@/components/insights/InsightsPanel'
import { GoalProgress } from '@/components/goal-progress'
import { WhoplyticsLogo } from '@/components/whoplytics-logo'
import { env } from '@/lib/env'
import { RemoveScopeBadge } from '@/components/remove-scope-badge'

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
  let experienceIdWasUpdated = false
  let companyId: string | null = null
  let experienceName: string | null = null
  
  // If user is authenticated via Whop headers, we can auto-create installation
  if (whopUser && whopUser.userId) {
    console.log('[Experience Page] ✅ Whop user authenticated via iframe headers:', whopUser.userId)
    
    let companyId: string | null = null
    
    // Try to get companyId and experience name from experience API
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
        // Extract experience name from various possible fields
        experienceName = expData.name || expData.title || expData.slug || expData.display_name || expData.company?.title || null
        
        if (companyId) {
          console.log('[Experience Page] Got companyId from experience:', companyId)
        } else {
          console.log('[Experience Page] ⚠️ Experience data missing companyId')
        }
        if (experienceName) {
          console.log('[Experience Page] Got experience name:', experienceName)
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
        
        // CRITICAL: Ensure CompanyPrefs exists for new installation (onboarding will show)
        try {
          const { getCompanyPrefs } = await import('@/lib/company')
          await getCompanyPrefs(companyId) // This will create default prefs if they don't exist
          console.log('[Experience Page] ✅ Ensured CompanyPrefs exists for new installation')
        } catch (prefsError) {
          console.error('[Experience Page] Error ensuring CompanyPrefs:', prefsError)
          // Continue - getCompanyPrefs will try again later
        }
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
    experienceIdWasUpdated = true

    // CRITICAL: Treat this as a fresh install event. Reset plan to free and onboarding to incomplete.
    try {
      if (installation.plan !== 'free') {
        await prisma.whopInstallation.update({
          where: { companyId: installation.companyId },
          data: { plan: 'free', updatedAt: new Date() },
        })
        console.log('[Experience Page] ✅ Reset plan to free due to reinstall')
        // Refresh after plan change
        const refreshed = await prisma.whopInstallation.findUnique({ where: { companyId: installation.companyId } })
        if (refreshed) installation = refreshed
      }
      const { getCompanyPrefs, setCompanyPrefs } = await import('@/lib/company')
      const prefs = await getCompanyPrefs(installation.companyId)
      if (prefs.completedAt !== null) {
        await setCompanyPrefs(installation.companyId, { completedAt: null })
        console.log('[Experience Page] ✅ Reset onboarding (completedAt=null) due to reinstall')
      }
    } catch (resetError) {
      console.error('[Experience Page] Error resetting plan/onboarding on reinstall:', resetError)
    }
  }

  // STEP 4: Refresh installation from DB to get latest plan (webhook may have updated it)
  // Also check if user has another installation with pro plan that should be used instead
  console.log('[Experience Page] Refreshing installation from database to get latest plan...')
  
  // Refresh installation to ensure latest plan from webhooks
  if (installation) {
    const freshInstallation = await prisma.whopInstallation.findUnique({
      where: { companyId: installation.companyId },
    })
    if (freshInstallation) {
      installation = freshInstallation
      console.log('[Experience Page] ✅ Installation refreshed, plan:', installation.plan)
    }
  }

  // If experienceId was updated in this request, treat as hard reinstall: force free + reset onboarding
  if (experienceIdWasUpdated && installation) {
    try {
      if (installation.plan !== 'free') {
        await prisma.whopInstallation.update({
          where: { companyId: installation.companyId },
          data: { plan: 'free', updatedAt: new Date() },
        })
        console.log('[Experience Page] ✅ [HARD-RESET] Forced plan to free due to experienceId change (reinstall)')
        const refreshed = await prisma.whopInstallation.findUnique({ where: { companyId: installation.companyId } })
        if (refreshed) installation = refreshed
      }
      const { setCompanyPrefs } = await import('@/lib/company')
      await setCompanyPrefs(installation.companyId, { completedAt: null })
      console.log('[Experience Page] ✅ [HARD-RESET] Forced onboarding reset due to experienceId change (reinstall)')
    } catch (hardResetErr) {
      console.error('[Experience Page] Error forcing free/reset on experienceId change:', hardResetErr)
    }
  }

  // EXTRA SAFETY: If installation was updated moments ago AND plan is free, consider it a fresh event and reset onboarding
  // BUT: Don't reset if user just upgraded to Pro (plan is pro/business)
  if (installation && installation.plan === 'free') {
    const updatedAgoMs = Date.now() - new Date(installation.updatedAt).getTime()
    if (updatedAgoMs < 5000) {
      try {
        const { setCompanyPrefs } = await import('@/lib/company')
        await setCompanyPrefs(installation.companyId, { completedAt: null })
        console.log('[Experience Page] ✅ [SAFETY] Reset onboarding due to recent installation update (', updatedAgoMs, 'ms )')
      } catch (sErr) {
        console.error('[Experience Page] Error in safety onboarding reset:', sErr)
      }
    }
  }

  // Guard against stale Pro: verify active membership ONLY if installation wasn't recently updated
  // Skip check if installation was updated within last 60 seconds (webhook may have just upgraded)
  try {
    if (whopUser && whopUser.userId && installation && installation.plan && installation.plan !== 'free') {
      const updatedAgoMs = Date.now() - new Date(installation.updatedAt).getTime()
      const wasRecentlyUpdated = updatedAgoMs < 60000 // 60 seconds
      
      if (wasRecentlyUpdated) {
        console.log('[Experience Page] ⚠️ Skipping membership check - installation updated', Math.round(updatedAgoMs / 1000), 'seconds ago (likely from webhook)')
      } else {
        const userResponse = await fetch(`https://api.whop.com/api/v5/users/${whopUser.userId}/memberships`, {
          headers: { 'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}` },
          next: { revalidate: 0 },
        })
        let shouldDowngrade = false
        if (userResponse.ok) {
          const memberships = await userResponse.json()
          const planId = process.env.NEXT_PUBLIC_WHOP_PRO_PLAN_ID
          const hasPro = Array.isArray(memberships) && memberships.some((m: any) => {
            const status = m.status || m.state || m.membership_status
            const productId = m.product?.id || m.access_pass?.id || m.product_id
            return (status === 'valid' || status === 'active') && (!planId || productId === planId)
          })
          shouldDowngrade = !hasPro
        } else {
          // Don't downgrade on API errors - only downgrade if we can confirm no membership
          console.warn('[Experience Page] ⚠️ Unable to verify memberships, status:', userResponse.status, '- NOT downgrading (API may be unavailable)')
          shouldDowngrade = false
        }
        if (shouldDowngrade) {
          await prisma.whopInstallation.update({
            where: { companyId: installation.companyId },
            data: { plan: 'free', updatedAt: new Date() },
          })
          console.log('[Experience Page] ✅ Downgraded to free (confirmed no active membership)')
          const refreshed = await prisma.whopInstallation.findUnique({ where: { companyId: installation.companyId } })
          if (refreshed) installation = refreshed
          const { setCompanyPrefs } = await import('@/lib/company')
          await setCompanyPrefs(installation.companyId, { completedAt: null })
          console.log('[Experience Page] ✅ Reset onboarding due to downgrade')
        }
      }
    }
  } catch (verifyErr) {
    console.error('[Experience Page] Error verifying memberships:', verifyErr)
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
    // Check for Pro upgrade welcome BEFORE checking onboarding
    console.log('[Experience Page] Checking onboarding status for companyId:', finalCompanyId, 'experienceId:', experienceId)
    
    let prefs
    let onboardingComplete = false
    let showProWelcome = false
    
    try {
      prefs = await getCompanyPrefs(finalCompanyId)
      
      // Check if user just upgraded to Pro (plan is pro/business, recently updated, onboarding completed, but welcome not shown)
      const isPro = installation.plan === 'pro' || installation.plan === 'business'
      const updatedAgoMs = Date.now() - new Date(installation.updatedAt).getTime()
      const wasRecentlyUpdated = updatedAgoMs < 60000 // 60 seconds
      const onboardingWasCompleted = prefs.completedAt !== null
      const proWelcomeNotShown = prefs.proWelcomeShownAt === null
      
      if (isPro && wasRecentlyUpdated && onboardingWasCompleted && proWelcomeNotShown) {
        console.log('[Experience Page] ✅ Pro upgrade detected - showing Pro welcome modal')
        showProWelcome = true
      }
      
      // Check if installation was just CREATED (not just updated)
      // This indicates a truly fresh install, not just an experienceId update
      const installationJustCreated = installation.createdAt && 
        (Date.now() - new Date(installation.createdAt).getTime()) < 10 * 60 * 1000 // 10 minutes
      const wasJustCreated = installationJustCreated && 
        (new Date(installation.createdAt).getTime() === new Date(installation.updatedAt).getTime() || 
         (new Date(installation.updatedAt).getTime() - new Date(installation.createdAt).getTime()) < 60000) // Created and updated within 1 min
      
      console.log('[Experience Page] Installation check:', {
        createdAt: installation.createdAt,
        updatedAt: installation.updatedAt,
        justCreated: wasJustCreated,
        wasCompleted: !!prefs.completedAt,
        experienceIdMatches: installation.experienceId === experienceId,
        isPro,
        showProWelcome,
      })
      
      // Only reset onboarding if:
      // 1. Installation was just created (truly fresh install)
      // 2. AND onboarding was never completed for this companyId
      // 3. AND NOT a Pro upgrade (don't reset onboarding for Pro users)
      if (wasJustCreated && !prefs.completedAt && !isPro) {
        console.log('[Experience Page] Fresh installation detected - onboarding not completed yet')
        onboardingComplete = false
      } else {
        // Check normal onboarding completion status
        onboardingComplete = await isOnboardingComplete(finalCompanyId)
      }
      
      console.log('[Experience Page] Onboarding status:', {
        companyId: finalCompanyId,
        experienceId: experienceId,
        completedAt: prefs.completedAt,
        isComplete: onboardingComplete,
        hasGoalAmount: !!prefs.goalAmount,
        wasJustCreated,
        showProWelcome,
      })
    } catch (prefsError) {
      console.error('[Experience Page] Error checking onboarding status:', prefsError)
      // On error, assume not complete to show wizard
      onboardingComplete = false
      // Create minimal prefs object
      prefs = {
        goalAmount: null,
        completedAt: null,
        companyId: finalCompanyId,
      } as any
    }

    // Show Pro welcome modal if user just upgraded
    if (showProWelcome) {
      console.log('[Experience Page] Showing Pro welcome modal')
      const sessionTokenForClient = (global as any).__whopSessionToken
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
          <TokenCleanup />
          <ProWelcomeWrapper
            companyId={finalCompanyId}
          />
        </div>
      )
    }

    // BLOCK dashboard access until onboarding is complete
    if (!onboardingComplete) {
      console.log('[Experience Page] Onboarding NOT complete - showing wizard')
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
    
    console.log('[Experience Page] Onboarding complete - proceeding to dashboard')

    // Fetch dashboard data and plan with error handling (only after onboarding check)
    console.log('[Experience Page] Onboarding complete, fetching dashboard data for companyId:', finalCompanyId)
           
           let dashboardData, plan
           try {
             // Use installation.plan directly (most up-to-date from webhooks, already refreshed in STEP 4)
             plan = installation.plan || 'free'
             
             // Fetch dashboard data - Pro users get 90 days, Free users get 7 days
             const { getDaysForPlan } = await import('@/lib/data-window')
             const daysToFetch = getDaysForPlan(plan)
             dashboardData = await getCompanySeries(finalCompanyId, daysToFetch)
             
             console.log('[Experience Page] Dashboard data fetched successfully, plan:', plan)
    } catch (fetchError) {
      console.error('[Experience Page] Failed to fetch dashboard data:', fetchError)
      throw fetchError
    }

           // Get upgrade URL with company context for better Whop integration
           const upgradeUrl = getUpgradeUrl(finalCompanyId)

    // Calculate monthly revenue and get last sync date
    const monthlyRevenue = await getMonthlyRevenue(finalCompanyId)
    const lastSyncAt = dashboardData.kpis.latestDate
    const goalAmount = prefs.goalAmount ? Number(prefs.goalAmount) : null

    // Fetch experience name right before rendering to ensure it's available
    // First check if we already have it stored in the database
    let finalExperienceName = installation?.experienceName || experienceName
    if (!finalExperienceName && installation) {
      try {
        const { env } = await import('@/lib/env')
        console.log('[Experience Page] Attempting to fetch experience name for:', experienceId)
        
        // Try with app server key first
        let expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
          headers: {
            'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
          },
        })
        
        // If that fails, try with user's access token from installation
        if (!expResponse.ok && installation.accessToken && installation.accessToken !== env.WHOP_APP_SERVER_KEY) {
          console.log('[Experience Page] App server key failed, trying with user access token...')
          expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
            headers: {
              'Authorization': `Bearer ${installation.accessToken}`,
            },
          })
        }
        
        if (expResponse.ok) {
          const expData = await expResponse.json()
          console.log('[Experience Page] Experience API response keys:', Object.keys(expData))
          // Try multiple possible fields for experience name
          finalExperienceName = expData.name || expData.title || expData.slug || expData.display_name || expData.company?.title || null
          if (finalExperienceName) {
            console.log('[Experience Page] ✅ Fetched experience name:', finalExperienceName)
            // Save to database for future use
            await prisma.whopInstallation.update({
              where: { companyId: installation.companyId },
              data: { experienceName: finalExperienceName },
            })
            // Refresh installation to include the new experienceName
            installation = await prisma.whopInstallation.findUnique({
              where: { companyId: installation.companyId },
            })
          } else {
            console.log('[Experience Page] ⚠️ Experience data received but no name field found. Full response:', JSON.stringify(expData, null, 2))
          }
        } else {
          // If experience API fails, try fetching company name from company API
          console.log('[Experience Page] Experience API failed, trying company API for company name...')
          try {
            const companyResponse = await fetch(`https://api.whop.com/api/v5/companies/${installation.companyId}`, {
              headers: {
                'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
              },
            })
            
            if (companyResponse.ok) {
              const companyData = await companyResponse.json()
              console.log('[Experience Page] Company API response keys:', Object.keys(companyData))
              // Try company name/title fields
              finalExperienceName = companyData.name || companyData.title || companyData.display_name || null
              if (finalExperienceName) {
                console.log('[Experience Page] ✅ Fetched company name as experience name:', finalExperienceName)
                // Save to database for future use
                await prisma.whopInstallation.update({
                  where: { companyId: installation.companyId },
                  data: { experienceName: finalExperienceName },
                })
                // Refresh installation to include the new experienceName
                installation = await prisma.whopInstallation.findUnique({
                  where: { companyId: installation.companyId },
                })
              }
            } else {
              const errorText = await companyResponse.text().catch(() => 'Unable to read error')
              console.log('[Experience Page] ⚠️ Company API returned:', companyResponse.status, errorText.substring(0, 200))
            }
          } catch (companyError) {
            console.error('[Experience Page] Error fetching company name:', companyError)
          }
        }
      } catch (expError) {
        console.error('[Experience Page] Error fetching experience name:', expError)
      }
    }

    // CRITICAL: Refresh installation one final time to ensure we have the latest experienceName
    // This ensures any updates we made to the database are reflected in the UI
    if (installation) {
      const refreshedInstallation = await prisma.whopInstallation.findUnique({
        where: { companyId: installation.companyId },
      })
      if (refreshedInstallation) {
        installation = refreshedInstallation
        console.log('[Experience Page] ✅ Installation refreshed before render, experienceName:', installation.experienceName || '(not set)')
      }
    }

    // Dashboard content with new UI
    // SessionSetter will set cookie via API route if we have Whop auth session
    // TokenCleanup will remove token from URL after session is confirmed
    const sessionTokenForClient = (global as any).__whopSessionToken
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
        <TokenCleanup />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
          <RemoveScopeBadge />
          {/* Elegant Compact Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left: Branding */}
              <div className="flex items-center gap-3">
                <WhoplyticsLogo 
                  personalizedText={installation?.experienceName ? `${installation.experienceName} Analytics` : (installation?.username ? `${installation.username}'s Analytics` : 'Your Analytics')}
                  tagline="Business insights at a glance"
                />
                {/* Company/scope badge removed per request */}
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

          {/* Goal Progress Bar */}
          <div className="mb-6">
            <GoalProgress
              goalAmount={goalAmount}
              revenueThisMonth={monthlyRevenue}
              lastSyncAt={lastSyncAt}
              companyId={finalCompanyId}
            />
          </div>

          {/* Dashboard view */}
          <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} companyId={finalCompanyId} />

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

