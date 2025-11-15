/**
 * Experience-scoped dashboard page
 * Accessed via Whop app iframes with experienceId in the URL
 */

import { linkExperienceToCompany } from '@/lib/company'
import { getCompaniesForUser } from '@/lib/whop-rest'
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
import { headers } from 'next/headers'
import { whopSdk } from '@/lib/whop-sdk'

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
  const { token, ...otherSearchParams } = resolvedSearchParams as Record<string, string | undefined>
  if (Object.keys(otherSearchParams).length > 0) {
    console.log('[Experience Page] Search params snapshot:', otherSearchParams)
  }

  // Install trace logging
  console.log("[Whoplytics] experience-enter", { experienceId })

  try {
    console.log('[Whoplytics] [Experience Page] START - experienceId:', experienceId)

    const headersList = await headers()
    const referer = headersList.get('referer') || ''
    const refererBizMatch = referer.match(/dashboard\/(biz_[A-Za-z0-9]+)/)
    const refererBizId = refererBizMatch?.[1] || null

    const whopHeadersDebug: Record<string, string | null> = {}
    for (const [key, value] of headersList.entries()) {
      if (key.startsWith('x-whop') && key !== 'x-whop-user-token') {
        whopHeadersDebug[key] = value
      }
    }
    console.log('[Experience Page] Whop headers snapshot:', whopHeadersDebug)

    console.log('[Whoplytics] Step 1: Checking Whop iframe authentication...')
    const whopUser = await verifyWhopUserToken()
    let session = await getSession(token).catch(() => null)
    
    // Check for installation by experienceId
    let installation = await prisma.whopInstallation.findUnique({ where: { experienceId } }).catch(() => null)
    
    let experienceName: string | null = installation?.experienceName || null
    
    let experienceIdWasUpdated = false
    
    // Fetch user profile data and experience name from Whop API if available
    if (whopUser && whopUser.userId && installation) {
      
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
          const username = userData.username || userData.name || userData.display_name || installation?.username || null
          
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
          
          if (installation && Object.keys(updateData).length > 0) {
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
      if (installation && !experienceName) {
        try {
          const expResponse = await fetch(`https://api.whop.com/api/v5/experiences/${installation.experienceId ?? experienceId}`, {
            headers: {
              'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
            },
          })
          
          if (expResponse.ok) {
            const expData = await expResponse.json()
            experienceName = expData.name || expData.title || expData.slug || expData.display_name || expData.company?.title || null
            
            if (experienceName && installation) {
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

    // If no installation found, create it using best available companyId
    if (!installation && whopUser?.userId) {
      console.log('[Experience Page] No installation found, resolving companyId...')
      
      try {
        const whopUserCompanyId =
          whopUser.companyId && whopUser.companyId.startsWith('biz_') ? whopUser.companyId : null
        const sessionCompanyId =
          session?.companyId && session.companyId.startsWith('biz_') ? session.companyId : null
        const sessionExperienceId = session?.experienceId || null

        if (sessionCompanyId && sessionExperienceId && sessionExperienceId !== experienceId) {
          console.log('[Experience Page] Ignoring session companyId - experience mismatch', {
            sessionCompanyId,
            sessionExperienceId,
            currentExperienceId: experienceId,
          })
        }

        const sessionCompanyCandidate =
          sessionCompanyId && sessionExperienceId === experienceId ? sessionCompanyId : null

        let resolvedCompanyId: string | null = whopUserCompanyId
        
        if (!resolvedCompanyId) {
          try {
            const experience = await whopSdk.experiences.getExperience({ experienceId })
            if (experience) {
              console.log('[Experience Page] ✅ Got experience data using Whop SDK')
              const experienceCompanyCandidates = [
                experience?.company?.id,
                (experience as any)?.company_id,
                (experience as any)?.companyId,
                (experience as any)?.workspace?.company?.id,
                (experience as any)?.workspace?.id,
              ].filter(Boolean) as string[]

              const expCompanyMatch = experienceCompanyCandidates.find(
                (value) => typeof value === 'string' && value.startsWith('biz_')
              )

              if (expCompanyMatch) {
                resolvedCompanyId = expCompanyMatch
                console.log('[Experience Page] Resolved companyId from Whop SDK experience payload:', resolvedCompanyId)
              } else if (experienceCompanyCandidates.length > 0) {
                console.log('[Experience Page] SDK experience payload company candidates (non-biz):', experienceCompanyCandidates)
              }
            } else {
              console.warn('[Experience Page] Whop SDK returned null for experience', experienceId)
            }
          } catch (sdkErr) {
            console.warn('[Experience Page] Whop SDK experience fetch failed:', sdkErr)
          }
        }

        if (!resolvedCompanyId) {
          const searchParamBiz = Object.values(otherSearchParams).find(
            (value) => typeof value === 'string' && value.startsWith('biz_')
          )
          if (searchParamBiz) {
            resolvedCompanyId = searchParamBiz
            console.log('[Experience Page] Using companyId from search params:', resolvedCompanyId)
          }
        }

        // Fall back to referer biz id (if Whop dashboard passed it)
        if (!resolvedCompanyId && refererBizId?.startsWith('biz_')) {
          resolvedCompanyId = refererBizId
          console.log('[Experience Page] Using referer-derived companyId:', resolvedCompanyId)
        }

        // Fall back to any existing installations for this user
        if (!resolvedCompanyId) {
          const recentInstallation = await prisma.whopInstallation.findFirst({
            where: {
              userId: whopUser.userId,
              companyId: { startsWith: 'biz_' },
            },
            orderBy: { updatedAt: 'desc' },
          })
          if (recentInstallation?.companyId?.startsWith('biz_')) {
            resolvedCompanyId = recentInstallation.companyId
            console.log('[Experience Page] Using prior installation companyId:', resolvedCompanyId)
          }
        }

        // Fall back to Whop REST user companies
        if (!resolvedCompanyId) {
          try {
            const userTokenHeader = headersList.get('x-whop-user-token') || undefined
            const companies = await getCompaniesForUser(whopUser.userId, {
              accessToken: userTokenHeader || undefined,
            })

            const companyIds = companies
              .map((company: any) => {
                if (!company) return null
                const candidates = [
                  company.id,
                  company.company_id,
                  company.companyId,
                  company.company?.id,
                  company.company?.company_id,
                  company.company?.companyId,
                ]
                return candidates.find(
                  (value) => typeof value === 'string' && value.startsWith('biz_')
                )
              })
              .filter(Boolean) as string[]

            const refererMatch = refererBizId
              ? companyIds.find((id) => id === refererBizId)
              : null

            resolvedCompanyId = refererMatch || companyIds[0] || null
            if (resolvedCompanyId) {
              console.log('[Experience Page] Resolved companyId via getCompaniesForUser:', resolvedCompanyId)
            }
          } catch (companiesError) {
            console.warn('[Experience Page] Failed to resolve via getCompaniesForUser:', companiesError)
          }
        }

        if (!resolvedCompanyId && sessionCompanyCandidate) {
          resolvedCompanyId = sessionCompanyCandidate
          console.log('[Experience Page] Using session companyId as last resort:', resolvedCompanyId)
        }
        
        if (resolvedCompanyId?.startsWith('biz_')) {
          console.log('[Experience Page] Creating installation with companyId:', resolvedCompanyId)
          installation = await prisma.whopInstallation.create({
            data: {
              companyId: resolvedCompanyId,
              userId: whopUser.userId,
              experienceId,
              accessToken: env.WHOP_APP_SERVER_KEY,
              plan: 'free',
              username: whopUser.username || null,
            },
          })
          console.log('[Experience Page] ✅ Created installation:', {
            id: installation.id,
            companyId: installation.companyId,
            experienceId: installation.experienceId,
          })
          
          // Ensure CompanyPrefs exists
          try {
            const { getCompanyPrefs } = await import('@/lib/company')
            await getCompanyPrefs(resolvedCompanyId)
          } catch (prefsError) {
            console.error('[Experience Page] Error ensuring CompanyPrefs:', prefsError)
          }
        } else {
          console.warn('[Experience Page] Could not resolve companyId from session or experience API')
        }
      } catch (createErr: any) {
        console.error('[Experience Page] Failed to create installation:', createErr)
        // Handle unique constraint violations
        if (createErr.code === 'P2002' && createErr.meta?.target?.includes('experienceId')) {
          console.warn('[Experience Page] ExperienceId conflict - installation may already exist')
          // Try to find it again
          installation = await prisma.whopInstallation.findUnique({ where: { experienceId } }).catch(() => null)
        }
      }
    }
    
    // If still no installation, show setup card
    if (!installation) {
      console.warn('[Experience Page] Installation not found and could not be created')
      if (!token) {
        const loginUrl = `/login?experienceId=${experienceId}&reason=install_missing`
        console.log('[Experience Page] No session token present - redirecting user to login for OAuth:', loginUrl)
        redirect(loginUrl)
      }
      const fallbackHref = `/experiences/${experienceId}/redirect`
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
            <Card className="p-8 text-center">
              <CardContent className="pt-6 space-y-4">
                <h2 className="text-2xl font-bold">Whoplytics Setup Required</h2>
                <p className="text-muted-foreground">
                  We could not automatically finish setup. Please refresh the page or contact support if this persists.
                </p>
                <div className="pt-4">
                  <Link href={fallbackHref}>
                    <Button variant="default">Open Dashboard</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

  // From here on, installation is guaranteed to exist

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
  
  // If we have Whop user auth but no session, create session token for immediate use
  // We can't set cookies in Server Components, so we'll use the token directly
    if (!session || session.companyId !== installation.companyId) {
      const newSession = {
        companyId: installation.companyId,
        userId: installation.userId || whopUser?.userId || null,
        username: whopUser?.username || installation.username || undefined,
        exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
        experienceId,
      }
      const newToken = Buffer.from(JSON.stringify(newSession)).toString('base64')
      ;(global as any).__whopSessionToken = newToken
      session = newSession as any
    } else if (!(global as any).__whopSessionToken && session) {
      const existingToken = Buffer.from(JSON.stringify(session)).toString('base64')
      ;(global as any).__whopSessionToken = existingToken
    }

    if (!session && whopUser && whopUser.userId) {
    console.log('[Experience Page] ✅ Whop user authenticated via iframe headers, creating session token...')
    
    // Verify user matches installation
    const userMatchesInstallation = 
      installation.userId === whopUser.userId || 
      installation.companyId === whopUser.userId ||
      installation.companyId === whopUser.companyId
    
    if (userMatchesInstallation) {
      // Create session token directly (we'll set cookie via API route on client side)
      const sessionPayload = {
        companyId: installation.companyId,
        userId: whopUser.userId,
        username: whopUser.username || installation.username,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        experienceId,
      }
      const sessionToken = Buffer.from(JSON.stringify(sessionPayload)).toString('base64')
      
      // Use the token as session data for this request
      session = sessionPayload as any
      
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

  if (!session || session.companyId !== finalCompanyId) {
    const newSession = {
      companyId: finalCompanyId,
      userId: installation.userId || whopUser?.userId || session?.userId || null,
      username: installation.username || whopUser?.username || session?.username || undefined,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      experienceId,
    }
    const newToken = Buffer.from(JSON.stringify(newSession)).toString('base64')
    ;(global as any).__whopSessionToken = newToken
    session = newSession as any
  } else if (session && !(global as any).__whopSessionToken) {
    const existingToken = Buffer.from(JSON.stringify(session)).toString('base64')
    ;(global as any).__whopSessionToken = existingToken
  }

  const sessionTokenForClient = (global as any).__whopSessionToken
  
  // Construct dashboard URL directly (same as redirect route does)
  const dashboardUrl = env.NEXT_PUBLIC_WHOP_APP_ID
    ? `https://whop.com/dashboard/${finalCompanyId}/apps/${env.NEXT_PUBLIC_WHOP_APP_ID}`
    : `/dashboard/${finalCompanyId}`
  
  console.log('[Experience Page] Showing welcome page with dashboard URL:', dashboardUrl)

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
            redirectHref={dashboardUrl}
          />
        </div>
      </div>
    </div>
  )
  } catch (error: any) {
    // CRITICAL: Re-throw NEXT_REDIRECT errors - Next.js needs to handle these
    if (error?.digest?.startsWith('NEXT_REDIRECT') || error?.message === 'NEXT_REDIRECT') {
      throw error
    }
    
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

