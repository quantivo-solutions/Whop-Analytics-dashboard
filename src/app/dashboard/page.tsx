import { DashboardView } from "@/components/dashboard-view"
import { NavHeader } from "@/components/nav-header"
import { getCompanySeries } from "@/lib/metrics"
import { getPlanForCompany, getUpgradeUrl } from "@/lib/plan"
import { PlanBadge } from "@/components/plan-badge"
import { UpgradeButton } from "@/components/upgrade-button"
import { prisma } from "@/lib/prisma"
import { ErrorDisplay } from "@/components/error-boundary"

// Disable caching for this page to ensure Whop badge updates
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  try {
    // Get the first/primary company installation
    // In production, this would be the authenticated user's company
    const whopInstallation = await prisma.whopInstallation.findFirst({
      orderBy: { createdAt: 'desc' }
    })
    
    // Use the company from installation, or fall back to demo
    const companyId = whopInstallation?.companyId || 'demo_company'

    // Fetch dashboard data and plan using shared helpers
    const [dashboardData, plan] = await Promise.all([
      getCompanySeries(companyId, 30),
      getPlanForCompany(companyId),
    ])

    const upgradeUrl = getUpgradeUrl()
    
    return (
      <div className="min-h-screen bg-background">
        <NavHeader
          showPlanBadge={true}
          planBadge={<PlanBadge plan={plan} />}
          upgradeButton={plan === 'free' ? <UpgradeButton upgradeUrl={upgradeUrl} size="sm" /> : undefined}
        />
        
        <div className="container mx-auto p-6">
          {/* Dashboard view */}
          <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />

          {/* Company info footer - for debugging */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-8 text-xs text-muted-foreground text-center">
              Dev Mode: Viewing {companyId} • Plan: {plan.toUpperCase()}
            </div>
          )}
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
