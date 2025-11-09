/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import { linkExperienceToCompany } from '@/lib/company'
import { getExperienceById } from '@/lib/whop-rest'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { TokenCleanup } from '@/components/token-cleanup'
import { SessionSetter } from '@/components/session-setter'
import { verifyWhopUserToken } from '@/lib/whop-auth'
import { env } from '@/lib/env'
import { ExperienceDashboardCard } from '@/components/experience-dashboard-card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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

  // Install trace logging
  console.log("[Whoplytics] experience-enter", { experienceId })

  try {
    console.log('[Whoplytics] [Experience Page] START - experienceId:', experienceId)

    // AUTO-CLAIM: Try to find installation by experienceId first
    let install = await prisma.whopInstallation.findUnique({ where: { experienceId } }).catch(() => null)

    // If no installation found, auto-claim by resolving companyId from Whop API
    if (!install) {
      console.log('[Whoplytics] No installation found for experienceId, attempting auto-claim...')
      
      try {
        const exp = await getExperienceById(experienceId)
        const companyId = exp?.company_id || exp?.company?.id || exp?.companyId
        
        if (companyId?.startsWith("biz_")) {
          // Link experience to company (creates or updates installation)
          const result = await linkExperienceToCompany({ experienceId, companyId })
          console.log('[Whoplytics] Auto-claimed install', { 
            experienceId, 
            companyId, 
            created: result.created, 
            updated: result.updated 
          })
          
          // Refresh installation after linking
          install = await prisma.whopInstallation.findUnique({ where: { experienceId } })
        } else {
          console.log('[Whoplytics] No biz_* company found for experience', { experienceId, companyId })
        }
      } catch (e) {
        console.warn('[Whoplytics] Auto-claim error', { experienceId, error: String(e) })
      }
    }

    // Do NOT return here; continue to normal discovery/create flow below

  // Proceed even if install is null; later logic will resolve or create it
  let installation = install as any
  let experienceName: string | null = (installation as any)?.experienceName || null
  
  // STEP 1: Check Whop iframe authentication (for session creation)
  console.log('[Whoplytics] Step 1: Checking Whop iframe authentication...')
  const whopUser = await verifyWhopUserToken()
  
  let experienceIdWasUpdated = false
  
  // Fetch user profile data and experience name from Whop API if available
  if (whopUser && whopUser.userId) {
    const { env } = await import('@/lib/env')
    
    // Fetch user profile data to get profilePicUrl and username
    try {
      const userResponse = await fetch(`https://api.whop.com/api/v5/users/${whopUser.userId}`, {
        headers: {
          'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
        },
      })
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        const profilePicUrl = userData.profile_picture_url || userData.profilePicUrl || userData.avatar_url || userData.avatar || null
        const username = userData.username || userData.name || userData.display_name || installation.username || null
        
        // Update installation with user profile data if missing or changed
        const updateData: any = {}
        if (profilePicUrl && (!installation.profilePicUrl || installation.profilePicUrl !== profilePicUrl)) {
          updateData.profilePicUrl = profilePicUrl
          console.log('[Experience Page] Updating profilePicUrl:', profilePicUrl)
        }
        if (username && (!installation.username || installation.username !== username)) {
          updateData.username = username
          console.log('[Experience Page] Updating username:', username)
        }
        
        if (Object.keys(updateData).length > 0 && installation && installation.companyId) {
          installation = await prisma.whopInstallation.update({
            where: { companyId: installation.companyId },
            data: updateData,
          })
          console.log('[Experience Page] ✅ Updated installation with user profile data')
        }
      }
    } catch (userError) {
      console.error('[Experience Page] Error fetching user profile:', userError)
    }
    
    // Try to fetch experience name from Whop API if not already set
    if (!experienceName) {
      try {
        const expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${experienceId}`, {
          headers: {
            'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
          },
        })
        
        if (expResponse.ok) {
          const expData = await expResponse.json()
          experienceName = expData.name || expData.title || expData.slug || expData.display_name || expData.company?.title || null
          
          if (experienceName && installation && installation.companyId) {
            console.log('[Experience Page] Got experience name:', experienceName)
            // Save to database
            installation = await prisma.whopInstallation.update({
              where: { companyId: installation.companyId },
              data: { experienceName } as any,
            })
          }
        }
      } catch (expError) {
        console.error('[Experience Page] Error fetching experience name:', expError)
      }
    }
  }

  // Ensure we have an installation before proceeding (legacy flow)
  if (!installation) {
    try {
      console.log('[Experience Page] Legacy resolve: finding installation...')
      // 1) Try by experienceId
      installation = await prisma.whopInstallation.findUnique({ where: { experienceId } })

      // 2) Try by Whop user context
      if (!installation && whopUser) {
        const candidateCompanyId = whopUser.companyId || whopUser.userId
        if (candidateCompanyId) {
          installation = await prisma.whopInstallation.findUnique({ where: { companyId: candidateCompanyId } })
        }
      }

      // 3) Try by userId most recent
      if (!installation && whopUser?.userId) {
        const userInstallations = await prisma.whopInstallation.findMany({
          where: { userId: whopUser.userId },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        })
        installation = userInstallations[0] || null
      }

      // 4) Create minimal installation if still not found and we have a candidate companyId
      if (!installation && whopUser) {
        const companyId = whopUser.companyId || whopUser.userId
        if (companyId) {
          console.log('[Experience Page] Creating minimal installation for companyId:', companyId)
          const { env } = await import('@/lib/env')
          installation = await prisma.whopInstallation.create({
            data: {
              companyId,
              userId: whopUser.userId,
              experienceId,
              accessToken: env.WHOP_APP_SERVER_KEY || '',
              plan: 'free',
              username: whopUser.username || null,
            },
          })
          // Ensure prefs exist
          try {
            const { getCompanyPrefs } = await import('@/lib/company')
            await getCompanyPrefs(companyId)
          } catch (e) {
            console.warn('[Experience Page] Failed to ensure CompanyPrefs on create:', e)
          }
        }
      }
    } catch (legacyErr) {
      console.error('[Experience Page] Legacy resolve error:', legacyErr)
    }
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
  
  console.log('[Experience Page] Valid session found, preparing handoff card - elapsed:', Date.now() - startTime, 'ms')

  const finalCompanyId = installation.companyId
  const sessionTokenForClient = (global as any).__whopSessionToken
  const internalDashboardHref = `/dashboard/${finalCompanyId}`

  let redirectCompanyId = finalCompanyId
  if (!redirectCompanyId.startsWith('biz_') && installation.experienceId) {
    try {
      const exp = await getExperienceById(installation.experienceId)
      const expCompanyId = exp?.company?.id || exp?.company_id || null
      if (expCompanyId?.startsWith('biz_')) {
        redirectCompanyId = expCompanyId
      }
    } catch (resolveErr) {
      console.warn('[Experience Page] Unable to resolve biz_ companyId for redirect:', resolveErr)
    }
  }

  const whopDashboardHref = env.NEXT_PUBLIC_WHOP_APP_ID
    ? `https://whop.com/dashboard/${redirectCompanyId}/apps/${env.NEXT_PUBLIC_WHOP_APP_ID}`
    : null

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-white dark:from-slate-950 dark:via-slate-900 dark:to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(236,72,153,0.12),transparent)]" />
      <div className="relative">
        {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
        <TokenCleanup />
        <div className="px-6 sm:px-10 lg:px-12 py-16 sm:py-20">
          <ExperienceDashboardCard
            companyId={finalCompanyId}
            experienceName={(installation as any)?.experienceName || installation.username || null}
            internalDashboardHref={internalDashboardHref}
            whopDashboardHref={whopDashboardHref}
          />
        </div>
      </div>
    </div>
  )
  } catch (error: any) {
    // CRITICAL: Never 500 on unknown IDs - return friendly 200 OK response instead
    console.error('[Whoplytics] Error loading experience dashboard:', {
      experienceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
    })
    
    // Return friendly "Not installed yet" state with Install CTA (200 OK, not 500)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
          <Card className="p-8 text-center">
            <CardContent className="pt-6 space-y-4">
              <h2 className="text-2xl font-bold">Whoplytics Setup Required</h2>
              <p className="text-muted-foreground">
                We couldn't automatically set up your analytics dashboard. Please install Whoplytics from your Whop dashboard.
              </p>
              <div className="pt-4">
                <Link href="/discover">
                  <Button variant="default">Learn More</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
}

