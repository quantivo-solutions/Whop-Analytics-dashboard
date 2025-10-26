import { DashboardView } from "@/components/dashboard-view"
import { NavHeader } from "@/components/nav-header"
import { getCompanySeries } from "@/lib/metrics"
import { getPlanForCompany, getUpgradeUrl } from "@/lib/plan"
import { PlanBadge } from "@/components/plan-badge"
import { UpgradeButton } from "@/components/upgrade-button"
import { CompanySelector } from "@/components/company-selector"
import { prisma } from "@/lib/prisma"
import { ErrorDisplay } from "@/components/error-boundary"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

// Disable caching for this page to ensure Whop badge updates
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Dashboard() {
  try {
    // Get ALL companies ordered by most recently created
    const allCompanies = await prisma.whopInstallation.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        companyId: true,
        plan: true,
        experienceId: true,
      }
    })
    
    // Use the most recently created company, or fall back to demo
    const companyId = allCompanies[0]?.companyId || 'demo_company'

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
          {/* Company Selector - Show if multiple companies exist */}
          {allCompanies.length > 1 && (
            <Card className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      Multiple Companies Detected
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      You have {allCompanies.length} companies. Currently viewing: <strong>{companyId}</strong> ({plan})
                    </p>
                    <div className="flex items-center gap-2">
                      <CompanySelector companies={allCompanies} currentCompanyId={companyId} />
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        ← Select a different company
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Dashboard view */}
          <DashboardView data={dashboardData} showBadge={true} plan={plan} upgradeUrl={upgradeUrl} />

          {/* Company info footer */}
          <div className="mt-8 text-xs text-muted-foreground text-center">
            Viewing: <strong>{companyId}</strong> • Plan: <strong>{plan.toUpperCase()}</strong>
            {allCompanies.length > 1 && (
              <span className="block mt-1 text-blue-600 dark:text-blue-400">
                {allCompanies.length} companies available
              </span>
            )}
          </div>
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
