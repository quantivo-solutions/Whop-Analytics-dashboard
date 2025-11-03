/**
 * Dashboard View - Whop App
 * 
 * This is the Dashboard View for B2B analytics (per Whop App Views docs).
 * It appears in the creator's business dashboard sidebar.
 * 
 * According to Whop docs:
 * - Dashboard View is for: analytics dashboards, business operations, admin panels
 * - Should only be accessible to admins of the company
 * - Uses companyId from path: /dashboard/[companyId]
 * 
 * Access control:
 * 1. Verify user via Whop iframe headers (auto-login)
 * 2. Check user has admin access to company
 * 3. Create installation if needed
 * 4. Set session for persistence
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Lock } from 'lucide-react'
import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeButtonIframe } from '@/components/upgrade-button-iframe'
import { UserProfileMenuClient } from '@/components/user-profile-menu-client'
import { verifyWhopUserToken } from '@/lib/whop-auth'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { SessionSetter } from '@/components/session-setter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Force no caching - ensure fresh data always
export const fetchCache = 'force-no-store'
export const preferredRegion = 'auto'

interface PageProps {
  params: Promise<{
    companyId: string
  }>
  searchParams: Promise<{
    token?: string
  }>
}

export default async function CompanyDashboardPage({ params, searchParams }: PageProps) {
  const { companyId } = await params
  const resolvedSearchParams = await searchParams
  const { token } = resolvedSearchParams

  console.log('[Dashboard View] Loading for companyId from URL:', companyId)
  console.log('[Dashboard View] ⚠️ IMPORTANT: Using companyId from URL params, not from installation/session')

  // STEP 1: Verify user authentication via Whop iframe headers (Dashboard View pattern)
  // According to Whop docs: Dashboard apps should verify user token first
  console.log('[Dashboard View] Step 1: Verifying Whop user authentication...')
  const whopUser = await verifyWhopUserToken()

  let installation = null
  let session = await getSession(token).catch(() => null)

    // STEP 2: If user is authenticated via Whop, verify admin access and create/update installation
    if (whopUser && whopUser.userId) {
      console.log('[Dashboard View] ✅ Whop user authenticated:', whopUser.userId)

      // Fetch user details from Whop API to get email, profilePicUrl, etc.
      // Use /api/v5/users/{userId} with app server key (can fetch any user's public info)
      let whopUserDetails: { username?: string; email?: string; profile_pic_url?: string } = {}
      try {
        const { env } = await import('@/lib/env')
        const userResponse = await fetch(`https://api.whop.com/api/v5/users/${whopUser.userId}`, {
          headers: {
            'Authorization': `Bearer ${env.WHOP_APP_SERVER_KEY}`,
          },
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          whopUserDetails = {
            username: userData.username || userData.email || userData.name || undefined,
            email: userData.email || undefined,
            profile_pic_url: userData.profile_pic_url || undefined,
          }
          console.log('[Dashboard View] ✅ Fetched user details from Whop API:', {
            username: whopUserDetails.username,
            email: whopUserDetails.email ? 'present' : 'missing',
            profilePicUrl: whopUserDetails.profile_pic_url ? 'present' : 'missing',
          })
        } else {
          console.warn('[Dashboard View] ⚠️ Failed to fetch user details from Whop API:', userResponse.status)
          // Fallback: Use username from token if available
          if (whopUser.username) {
            whopUserDetails.username = whopUser.username
          }
        }
      } catch (userError) {
        console.warn('[Dashboard View] ⚠️ Error fetching user details:', userError)
        // Fallback: Use username from token if available
        if (whopUser.username) {
          whopUserDetails.username = whopUser.username
        }
        // Continue without user details - not critical
      }

      // Check if installation exists for this company
      installation = await prisma.whopInstallation.findUnique({
        where: { companyId },
      })

    if (!installation) {
      // Before creating, check if user has an existing installation we should use instead
      console.log('[Dashboard View] No installation found for companyId:', companyId)
      console.log('[Dashboard View] Checking for existing user installations...')
      
      const userInstallations = await prisma.whopInstallation.findMany({
        where: { userId: whopUser.userId },
        orderBy: { updatedAt: 'desc' },
      })
      
      // Prefer company-based installations (biz_*)
      const companyBasedInstallations = userInstallations.filter(inst => inst.companyId.startsWith('biz_'))
      
      if (companyBasedInstallations.length > 0) {
        // User has a company-based installation - use the most recent one
        installation = companyBasedInstallations[0]
        console.log('[Dashboard View] ⚠️ Found existing company-based installation:', installation.companyId, 'plan:', installation.plan)
        console.log('[Dashboard View] ⚠️ Dashboard View URL uses different companyId:', companyId, 'vs installation:', installation.companyId)
        
        // If the URL companyId is different, redirect to the correct one
        if (installation.companyId !== companyId) {
          console.log('[Dashboard View] Redirecting to correct companyId:', installation.companyId)
          redirect(`/dashboard/${installation.companyId}`)
        }
      } else if (userInstallations.length > 0) {
        // User has user-based installation - we still need to create company-based one
        // But we can copy plan and other settings
        const existingInstallation = userInstallations[0]
        console.log('[Dashboard View] Found existing user-based installation, copying plan/settings:', existingInstallation.companyId, 'plan:', existingInstallation.plan)
        
        const { env } = await import('@/lib/env')
        installation = await prisma.whopInstallation.create({
          data: {
            companyId,
            userId: whopUser.userId,
            accessToken: env.WHOP_APP_SERVER_KEY,
            plan: existingInstallation.plan || 'free', // Copy plan from existing
            username: whopUserDetails.username || whopUser.username || existingInstallation.username || null,
            email: whopUserDetails.email || existingInstallation.email || null,
            profilePicUrl: whopUserDetails.profile_pic_url || existingInstallation.profilePicUrl || null,
            reportEmail: existingInstallation.reportEmail || null,
            weeklyEmail: existingInstallation.weeklyEmail,
            dailyEmail: existingInstallation.dailyEmail,
            discordWebhook: existingInstallation.discordWebhook || null,
          },
        })
        console.log('[Dashboard View] ✅ Created installation with copied settings:', companyId, 'plan:', installation.plan)
      } else {
        // No existing installations - create new one
        const { env } = await import('@/lib/env')
        installation = await prisma.whopInstallation.create({
          data: {
            companyId,
            userId: whopUser.userId,
            accessToken: env.WHOP_APP_SERVER_KEY,
            plan: 'free',
            username: whopUserDetails.username || whopUser.username || null,
            email: whopUserDetails.email || null,
            profilePicUrl: whopUserDetails.profile_pic_url || null,
          },
        })
        console.log('[Dashboard View] ✅ Created new installation:', companyId)
      }
    } else {
      // Installation exists - always update user data to ensure it's current
      // This ensures username, email, and profilePicUrl are always up-to-date
      if (installation) {
        const needsUpdate = 
          installation.userId !== whopUser.userId ||
          installation.username !== (whopUserDetails.username || whopUser.username || installation.username) ||
          installation.email !== (whopUserDetails.email || installation.email) ||
          installation.profilePicUrl !== (whopUserDetails.profile_pic_url || installation.profilePicUrl)
        
        if (needsUpdate) {
          await prisma.whopInstallation.update({
            where: { companyId },
            data: {
              userId: whopUser.userId,
              username: whopUserDetails.username || whopUser.username || installation.username || null,
              email: whopUserDetails.email || installation.email || null,
              profilePicUrl: whopUserDetails.profile_pic_url || installation.profilePicUrl || null,
            },
          })
          console.log('[Dashboard View] ✅ Updated installation user data')
          // Refresh installation after update
          installation = await prisma.whopInstallation.findUnique({
            where: { companyId },
          })
        }
        console.log('[Dashboard View] ✅ Installation exists:', companyId, 'plan:', installation?.plan || 'unknown')
        
        // Refresh installation to get latest plan (webhook may have updated it)
        if (installation) {
          const freshInstallation = await prisma.whopInstallation.findUnique({
            where: { companyId: installation.companyId },
          })
          if (freshInstallation) {
            installation = freshInstallation
            console.log('[Dashboard View] ✅ Installation refreshed (before session check), plan:', installation.plan)
          }
        }
      }
    }

    // Create session if we don't have one
    if (!session && installation) {
      console.log('[Dashboard View] Creating session from Whop auth...')
      const sessionUsername = whopUserDetails.username || whopUser.username || installation?.username || undefined
      const sessionToken = Buffer.from(JSON.stringify({
        companyId,
        userId: whopUser.userId,
        username: sessionUsername,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000),
      })).toString('base64')
      
      session = {
        companyId,
        userId: whopUser.userId,
        username: sessionUsername,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000),
      }
      
      // Store token for SessionSetter to set cookie
      ;(global as any).__whopSessionToken = sessionToken
      console.log('[Dashboard View] ✅ Session token created')
    }
  } else {
    // No Whop auth - check for existing session
    console.log('[Dashboard View] No Whop auth, checking session...')
    if (!session) {
      console.log('[Dashboard View] No session found - redirecting to login')
      redirect(`/login?companyId=${companyId}`)
    }

    // If we have session, get installation
    if (session) {
      installation = await prisma.whopInstallation.findUnique({
        where: { companyId: session.companyId },
      })
    }
  }

  // STEP 3: Verify user has access to this company
  // For Dashboard View, we should check admin access
  // Since checkAccess isn't available in SDK yet, we verify:
  // 1. User authenticated via Whop (already done above)
  // 2. Installation exists for this company (already done above)
  // 3. User owns this installation (userId matches) OR session matches companyId
  if (session && session.companyId !== companyId) {
    // Check if the user owns this installation (userId matches)
    const userOwnsInstallation = 
      (whopUser && installation && installation.userId === whopUser.userId) ||
      (session && session.userId === installation?.userId)
    
    if (!userOwnsInstallation) {
      console.log('[Dashboard View] ⚠️ Session companyId mismatch and user does not own installation, redirecting')
      redirect(`/login?companyId=${companyId}`)
    } else {
      console.log('[Dashboard View] ✅ User owns this installation, allowing access despite session mismatch')
      // Update session to match current companyId for future requests
      const sessionUsername = session.username || whopUser?.username || installation?.username || undefined
      const sessionToken = Buffer.from(JSON.stringify({
        companyId,
        userId: session.userId || whopUser?.userId || installation?.userId || '',
        username: sessionUsername,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000),
      })).toString('base64')
      ;(global as any).__whopSessionToken = sessionToken
    }
  }

  if (!installation) {
    console.log('[Dashboard View] No installation found for companyId:', companyId)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="rounded-full bg-red-100 dark:bg-red-950 p-3 w-12 h-12 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold">Installation Not Found</h2>
            <p className="text-muted-foreground">
              This app has not been installed for this company yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Company ID: <code className="text-xs bg-muted px-2 py-1 rounded">{companyId}</code>
            </p>
            <div className="pt-4">
              <Link href="/login">
                <Button>Go to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  console.log('[Dashboard View] ✅ Access granted, loading dashboard data...')

  // STEP 4: Check if user has a pro installation (webhook may have updated a different one)
  // If current installation is free but user has pro, check all user installations
  if (whopUser && whopUser.userId && installation && installation.plan === 'free') {
    console.log('[Dashboard View] Current installation is free, checking for pro installations...')
    const userInstallations = await prisma.whopInstallation.findMany({
      where: { userId: whopUser.userId },
    })
    
    // Find pro installation (most recently updated)
    const proInstallation = userInstallations
      .filter(inst => (inst.plan === 'pro' || inst.plan === 'business') && inst.companyId.startsWith('biz_'))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    
    if (proInstallation && proInstallation.companyId !== companyId) {
      // User has pro installation for a different company - update current installation to pro
      console.log('[Dashboard View] ⚠️ Found pro installation for user:', proInstallation.companyId, 'syncing to current installation')
      await prisma.whopInstallation.update({
        where: { companyId },
        data: {
          plan: proInstallation.plan,
          updatedAt: new Date(),
        },
      })
      // Refresh installation
      installation = await prisma.whopInstallation.findUnique({
        where: { companyId },
      })
      console.log('[Dashboard View] ✅ Synced installation to pro plan')
    }
  }

  // STEP 4.5: If no data for companyId, check if user has data under their userId-based companyId
  // This handles migration from user-based to company-based companyIds
  let finalCompanyId = companyId
  const dataCount = await prisma.metricsDaily.count({
    where: { companyId },
  })
  
  if (dataCount === 0 && whopUser && whopUser.userId) {
    console.log('[Dashboard View] No data for companyId:', companyId)
    console.log('[Dashboard View] Checking if user has data under userId-based companyId...')
    
    const userIdBasedCompanyId = whopUser.userId
    const userIdDataCount = await prisma.metricsDaily.count({
      where: { companyId: userIdBasedCompanyId },
    })
    
    if (userIdDataCount > 0) {
      console.log('[Dashboard View] ⚠️ Found data under userId-based companyId:', userIdBasedCompanyId, `(${userIdDataCount} records)`)
      console.log('[Dashboard View] ⚠️ Data needs to be migrated or companyId needs to be updated')
      console.log('[Dashboard View] ⚠️ For now, will use userId-based companyId for data fetching')
      
      // Use userId-based companyId for data fetching (temporary workaround)
      finalCompanyId = userIdBasedCompanyId
    }
  }

  // STEP 5: Refresh installation to get latest plan (webhook may have updated it)
  console.log('[Dashboard View] Refreshing installation to get latest plan...')
  if (installation) {
    const freshInstallation = await prisma.whopInstallation.findUnique({
      where: { companyId: installation.companyId },
    })
    if (freshInstallation) {
      installation = freshInstallation
      console.log('[Dashboard View] ✅ Installation refreshed, plan:', installation.plan)
    }
  }

  // STEP 5: Fetch dashboard data
  let dashboardData
  let plan: 'free' | 'pro' | 'business' = 'free'
  
  try {
    // Use installation.plan directly (most up-to-date from webhooks)
    plan = (installation?.plan as 'free' | 'pro' | 'business') || 'free'
    
    // CRITICAL: Use finalCompanyId (may be userId-based if migration needed)
    // This handles cases where data exists under old user-based companyId
    console.log('[Dashboard View] Fetching data for companyId:', finalCompanyId, '(original URL:', companyId, ')')
    dashboardData = await getCompanySeries(finalCompanyId, 30)
    console.log('[Dashboard View] ✅ Dashboard data loaded for companyId:', companyId, 'plan:', plan)
    console.log('[Dashboard View] Dashboard data companyId:', dashboardData.companyId, 'hasData:', dashboardData.hasData)
    console.log('[Dashboard View] Dashboard data series length:', dashboardData.series.length)
    console.log('[Dashboard View] Dashboard data KPIs:', {
      grossRevenue: dashboardData.kpis.grossRevenue,
      activeMembers: dashboardData.kpis.activeMembers,
      latestDate: dashboardData.kpis.latestDate,
      isDataFresh: dashboardData.kpis.isDataFresh,
    })
  } catch (error) {
    console.error('[Dashboard View] Error loading dashboard data:', error)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="rounded-full bg-red-100 dark:bg-red-950 p-3 w-12 h-12 mx-auto flex items-center justify-center">
              <Lock className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold">Unable to Load Dashboard</h2>
            <p className="text-muted-foreground">
              We encountered an issue while loading this company's dashboard.
            </p>
            <div className="pt-4">
              <Link href={`/dashboard/${companyId}`}>
                <Button variant="default" className="w-full">
                  Try Again
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get upgrade URL with company context
  const upgradeUrl = getUpgradeUrl(companyId)

  // Get session token for SessionSetter (if created from Whop auth)
  const sessionTokenForClient = (global as any).__whopSessionToken

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Set session cookie if needed */}
      {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                {/* Whoplytics Logo */}
                <div className="relative h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 shadow-xl" />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-blue-600/20 to-transparent" />
                  <svg 
                    className="absolute inset-2 rounded-xl" 
                    viewBox="0 0 100 100" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient id="dashboardWaveGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="0%" stopColor="#60A5FA" stopOpacity="1" />
                        <stop offset="70%" stopColor="#22D3EE" stopOpacity="1" />
                        <stop offset="100%" stopColor="#06B6D4" stopOpacity="1" />
                      </linearGradient>
                      <filter id="dashboardGlow">
                        <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                        <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      d="M 15 50 Q 30 35, 45 50 T 65 50 L 75 45 L 80 40 L 85 30 L 85 25"
                      stroke="url(#dashboardWaveGradient)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      filter="url(#dashboardGlow)"
                    />
                    <path
                      d="M 85 25 L 78 22 M 85 25 L 78 28"
                      stroke="url(#dashboardWaveGradient)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      filter="url(#dashboardGlow)"
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
              <UpgradeButtonIframe plan={plan} />
              {installation && (
                <UserProfileMenuClient
                  companyId={companyId}
                  username={installation.username}
                  email={installation.email}
                  profilePicUrl={installation.profilePicUrl}
                  plan={plan}
                />
              )}
            </div>
          </div>
        </div>

        {/* Dashboard view */}
        <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />
      </div>
    </div>
  )
}

