/**
 * Reusable Dashboard View Component
 * Used across all dashboard pages (main, experience-scoped, company-scoped)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, UserPlus, UserMinus, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import type { DashboardData } from '@/lib/metrics'

interface DashboardViewProps {
  data: DashboardData
  showBadge?: boolean
  badgeType?: 'live' | 'stale'
}

export function DashboardView({ data, showBadge = true, badgeType }: DashboardViewProps) {
  const { kpis, series, hasData } = data

  // Determine badge type if not explicitly provided
  const effectiveBadgeType = badgeType ?? (kpis.isDataFresh ? 'live' : 'stale')

  // Format date range for display
  const dateRange = series.length > 0
    ? `${new Date(series[0].date).toLocaleDateString()} - ${new Date(series[series.length - 1].date).toLocaleDateString()}`
    : 'No data'

  // Build stats data
  const statsData = [
    {
      title: 'Gross Revenue',
      value: `$${kpis.grossRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: kpis.latestDate ? `as of ${new Date(kpis.latestDate).toLocaleDateString()}` : 'no data yet',
      icon: DollarSign,
      trend: 'up' as const,
    },
    {
      title: 'Active Members',
      value: kpis.activeMembers.toLocaleString(),
      description: 'currently active',
      icon: Users,
      trend: 'up' as const,
    },
    {
      title: 'New Members',
      value: kpis.newMembers.toLocaleString(),
      description: 'joined recently',
      icon: UserPlus,
      trend: 'up' as const,
    },
    {
      title: 'Cancellations',
      value: kpis.cancellations.toLocaleString(),
      description: 'this period',
      icon: UserMinus,
      trend: 'down' as const,
    },
    {
      title: 'Trials Paid',
      value: kpis.trialsPaid.toLocaleString(),
      description: 'converted to paid',
      icon: CheckCircle,
      trend: 'up' as const,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header with optional badge */}
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        {showBadge && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${
              effectiveBadgeType === 'live'
                ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
            title={
              kpis.latestDate
                ? `Data from Whop webhooks. Last sync: ${new Date(kpis.latestDate).toLocaleString()}`
                : 'No data available yet'
            }
          >
            {effectiveBadgeType === 'live' ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                LIVE (Whop)
              </>
            ) : (
              <>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
                {hasData ? 'STALE' : 'NO DATA'}
              </>
            )}
          </span>
        )}
      </div>

      {/* Empty state */}
      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 mb-4">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We'll populate metrics as soon as your store gets its first member or payment.
              Data syncs automatically via webhooks.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      {hasData && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {statsData.map((stat, index) => {
            const Icon = stat.icon
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Chart preview */}
      {hasData && (
        <Card>
          <CardHeader>
            <CardTitle>30-Day Trend Data</CardTitle>
            <CardDescription>
              Revenue and member metrics over the last {series.length} days (ready for charting)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>📊 Chart data loaded: {series.length} records</p>
              <p>📅 Date range: {dateRange}</p>
              <p className="mt-2 text-xs">
                Data includes: grossRevenue, activeMembers, newMembers, cancellations, trialsPaid
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

