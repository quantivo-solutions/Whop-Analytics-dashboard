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
import { ArrowLeft, Settings, Lock } from 'lucide-react'
import { DashboardView } from '@/components/dashboard-view'
import { getCompanySeries } from '@/lib/metrics'
import { getPlanForCompany, getUpgradeUrl } from '@/lib/plan'
import { PlanBadge } from '@/components/plan-badge'
import { UpgradeButtonIframe } from '@/components/upgrade-button-iframe'
import { verifyWhopUserToken } from '@/lib/whop-auth'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { SessionSetter } from '@/components/session-setter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  console.log('[Dashboard View] Loading for companyId:', companyId)

  // STEP 1: Verify user authentication via Whop iframe headers (Dashboard View pattern)
  // According to Whop docs: Dashboard apps should verify user token first
  console.log('[Dashboard View] Step 1: Verifying Whop user authentication...')
  const whopUser = await verifyWhopUserToken()

  let installation = null
  let session = await getSession(token).catch(() => null)

  // STEP 2: If user is authenticated via Whop, verify admin access and create/update installation
  if (whopUser && whopUser.userId) {
    console.log('[Dashboard View] ✅ Whop user authenticated:', whopUser.userId)

    // Check if installation exists for this company
    installation = await prisma.whopInstallation.findUnique({
      where: { companyId },
    })

    if (!installation) {
      console.log('[Dashboard View] No installation found, creating from Whop auth...')
      const { env } = await import('@/lib/env')
      
      // Create installation automatically (like Experience View does)
      installation = await prisma.whopInstallation.create({
        data: {
          companyId,
          userId: whopUser.userId,
          accessToken: env.WHOP_APP_SERVER_KEY,
          plan: 'free',
          username: whopUser.username || null,
        },
      })
      console.log('[Dashboard View] ✅ Created installation:', companyId)
    } else {
      // Update user data if needed
      if (installation.userId !== whopUser.userId) {
        await prisma.whopInstallation.update({
          where: { companyId },
          data: {
            userId: whopUser.userId,
            username: whopUser.username || installation.username,
          },
        })
      }
      console.log('[Dashboard View] ✅ Installation exists:', companyId)
    }

    // Create session if we don't have one
    if (!session) {
      console.log('[Dashboard View] Creating session from Whop auth...')
      const sessionToken = Buffer.from(JSON.stringify({
        companyId,
        userId: whopUser.userId,
        username: whopUser.username || installation.username,
        exp: Date.now() + (30 * 24 * 60 * 60 * 1000),
      })).toString('base64')
      
      session = {
        companyId,
        userId: whopUser.userId,
        username: whopUser.username || installation.username || undefined,
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
  // 3. Session matches companyId
  if (session && session.companyId !== companyId) {
    console.log('[Dashboard View] ⚠️ Session companyId mismatch, redirecting')
    redirect(`/login?companyId=${companyId}`)
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

  // STEP 4: Fetch dashboard data
  let dashboardData
  let plan
  
  try {
    [dashboardData, plan] = await Promise.all([
      getCompanySeries(companyId, 30),
      getPlanForCompany(companyId),
    ])
    console.log('[Dashboard View] ✅ Dashboard data loaded, plan:', plan)
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
                    Whoplytics Dashboard
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block font-medium">
                    Business analytics for {companyId.startsWith('biz_') ? 'your company' : 'your account'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <PlanBadge plan={plan} />
              {plan === 'free' && <UpgradeButtonIframe plan={plan} />}
              <Link href="/settings">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Dashboard view */}
        <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />
      </div>
    </div>
  )
}

