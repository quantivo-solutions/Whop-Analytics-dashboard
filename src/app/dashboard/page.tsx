import { DashboardView } from "@/components/dashboard-view"
import { NavHeader } from "@/components/nav-header"
import { getCompanySeries } from "@/lib/metrics"
import { getPlanForCompany, getUpgradeUrl } from "@/lib/plan"
import { PlanBadge } from "@/components/plan-badge"
import { UpgradeButton } from "@/components/upgrade-button"
import { ErrorDisplay } from "@/components/error-boundary"
import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { LogoutButton } from "@/components/logout-button"
import { verifyWhopUserToken } from "@/lib/whop-auth"
import { prisma } from "@/lib/prisma"
import { SessionSetter } from "@/components/session-setter"

// Disable caching for this page to ensure Whop badge updates
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  try {
    console.log('[Dashboard] Loading dashboard page...')

    // STEP 1: Check Whop iframe authentication first (like Experience View)
    const whopUser = await verifyWhopUserToken()
    let session = await getSession().catch(() => null)
    let companyId: string | null = null

    // STEP 2: If Whop user authenticated, find/create installation
    if (whopUser && whopUser.userId) {
      console.log('[Dashboard] ✅ Whop user authenticated:', whopUser.userId)
      
      // Find the most recently updated installation for this user (most likely to have correct plan)
      let installation = await prisma.whopInstallation.findFirst({
        where: { userId: whopUser.userId },
        orderBy: { updatedAt: 'desc' }, // Most recently updated (likely just upgraded)
      })

      // If no installation found, try companyId from Whop user
      if (!installation && whopUser.companyId) {
        installation = await prisma.whopInstallation.findUnique({
          where: { companyId: whopUser.companyId },
        })
      }

      // If still no installation, use userId or companyId as companyId
      if (!installation) {
        companyId = whopUser.companyId || whopUser.userId
        
        // Create installation if needed
        const { env } = await import('@/lib/env')
        installation = await prisma.whopInstallation.create({
          data: {
            companyId,
            userId: whopUser.userId,
            accessToken: env.WHOP_APP_SERVER_KEY,
            plan: 'free',
            username: whopUser.username || null,
          },
        })
        console.log('[Dashboard] ✅ Created installation:', companyId)
      } else {
        companyId = installation.companyId
        console.log('[Dashboard] ✅ Found installation:', companyId, 'plan:', installation.plan)
      }

      // Create session if we don't have one
      if (!session) {
        console.log('[Dashboard] Creating session from Whop auth...')
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
        
        // Store token for SessionSetter
        ;(global as any).__whopSessionToken = sessionToken
        console.log('[Dashboard] ✅ Session token created')
      } else {
        companyId = session.companyId
      }
    } else {
      // No Whop auth - check for existing session
      console.log('[Dashboard] No Whop auth, checking session...')
      if (!session) {
        console.log('[Dashboard] No session found - redirecting to /login')
        redirect('/login')
      }
      companyId = session.companyId
    }

    console.log('[Dashboard] Using companyId:', companyId)

    // Fetch dashboard data and plan using shared helpers
    const [dashboardData, plan] = await Promise.all([
      getCompanySeries(companyId, 30),
      getPlanForCompany(companyId),
    ])

    // Get upgrade URL with company context
    const upgradeUrl = getUpgradeUrl(companyId)
    
    // Get session token for SessionSetter (if created from Whop auth)
    const sessionTokenForClient = (global as any).__whopSessionToken
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Set session cookie if needed */}
        {sessionTokenForClient && <SessionSetter sessionToken={sessionTokenForClient} />}
        
        <NavHeader
          showPlanBadge={true}
          planBadge={<PlanBadge plan={plan} />}
          upgradeButton={plan === 'free' ? <UpgradeButton upgradeUrl={upgradeUrl} size="sm" /> : undefined}
        />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
          {/* Company Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Logged in as: <span className="font-semibold text-foreground">{session?.username || companyId}</span>
              </p>
            </div>
            <LogoutButton />
          </div>

          {/* Dashboard view */}
          <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />
        </div>
      </div>
    )
  } catch (error: any) {
    // Log error for debugging
    console.error('Error loading dashboard:', error)
    
    // If it's a redirect error (from redirect() call), re-throw it
    // Next.js uses special errors for redirects that should not be caught
    if (error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error
    }
    
    // Show user-friendly error message for actual errors
    return (
      <ErrorDisplay
        title="Unable to Load Dashboard"
        message="We're having trouble loading your dashboard. This might be a temporary issue with our database connection."
        showRefreshButton={true}
        showHomeButton={false}
      />
    )
  }
}
