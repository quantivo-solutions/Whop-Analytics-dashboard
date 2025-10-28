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

// Disable caching for this page to ensure Whop badge updates
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  try {
    // Check authentication
    const session = await getSession()
    
    console.log('[Dashboard] Session check:', session ? `Found (${session.companyId})` : 'Not found')
    
    if (!session) {
      console.log('[Dashboard] No session, redirecting to /login')
      redirect('/login')
    }
    
    // Use company from session
    const companyId = session.companyId

    // Fetch dashboard data and plan using shared helpers
    const [dashboardData, plan] = await Promise.all([
      getCompanySeries(companyId, 30),
      getPlanForCompany(companyId),
    ])

    // Get upgrade URL with company context
    const upgradeUrl = getUpgradeUrl(companyId)
    
    return (
      <div className="min-h-screen bg-background">
        <NavHeader
          showPlanBadge={true}
          planBadge={<PlanBadge plan={plan} />}
          upgradeButton={plan === 'free' ? <UpgradeButton upgradeUrl={upgradeUrl} size="sm" /> : undefined}
        />
        
        <div className="container mx-auto p-6">
          {/* Company Header */}
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Logged in as: <span className="font-semibold text-foreground">{session.username || companyId}</span>
              </p>
            </div>
            <LogoutButton />
          </div>

          {/* Dashboard view */}
          <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />
        </div>
      </div>
    )
  } catch (error) {
    // Log error for debugging
    console.error('Error loading dashboard:', error)
    
    // Show user-friendly error message
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
