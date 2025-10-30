/**
 * Reusable Dashboard View Component
 * Used across all dashboard pages (main, experience-scoped, company-scoped)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, Users, UserPlus, UserMinus, CheckCircle, TrendingUp, TrendingDown, Info, Zap, Activity } from 'lucide-react'
import type { DashboardData } from '@/lib/metrics'
import type { Plan } from '@/lib/plan'
import { getPlanFeatures, hasPro } from '@/lib/plan'
import { ProFeatureLock } from './pro-feature-lock'
import { ModernChart } from './modern-chart'

interface DashboardViewProps {
  data: DashboardData
  showBadge?: boolean
  badgeType?: 'live' | 'stale'
  plan?: Plan
  upgradeUrl?: string
}

export function DashboardView({ data, showBadge = true, badgeType, plan = 'free', upgradeUrl }: DashboardViewProps) {
  const { kpis, series, hasData } = data

  // Determine badge type if not explicitly provided
  const effectiveBadgeType = badgeType ?? (kpis.isDataFresh ? 'live' : 'stale')
  
  // Get plan features
  const features = getPlanFeatures(plan)
  const isPro = hasPro(plan)

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
    <div className="space-y-6">
      {/* Status Badge - Compact & Elegant */}
      {showBadge && hasData && effectiveBadgeType === 'live' && (
        <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2.5 animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium text-green-900 dark:text-green-100">Live Data</span>
          </div>
          {kpis.latestDate && (
            <span className="text-xs text-green-700 dark:text-green-300">
              Updated {new Date(kpis.latestDate).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasData && (
        <Card className="border-dashed border-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
              <div className="relative rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 border border-blue-500/20">
                <Activity className="h-12 w-12 text-blue-500" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold mb-2">No activity yet</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Your analytics will appear here as soon as customers start joining your Whop.
              Data syncs automatically in real-time via webhooks.
            </p>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Waiting for your first member or payment...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards - Modern & Clean */}
      {hasData && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-5">
          {statsData.map((stat, index) => {
            const Icon = stat.icon
            const iconColors = [
              'bg-green-500',
              'bg-blue-500',
              'bg-purple-500',
              'bg-orange-500',
              'bg-pink-500',
            ]
            
            return (
              <Card 
                key={index} 
                className="relative overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 hover:shadow-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                style={{ 
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: 'backwards'
                }}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`${iconColors[index]} rounded-lg p-2 shadow-sm`}>
                      <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {stat.title}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground mb-0.5">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Charts Section */}
      {hasData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <ModernChart data={series} />
        </div>
      )}

      {/* Pro Features Section - Elegant Lock */}
      {hasData && !isPro && upgradeUrl && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '400ms', animationFillMode: 'backwards' }}>
          <ProFeatureLock
            title="Daily Trend Breakdown"
            description="Unlock daily email reports, Discord alerts, and advanced insights with Pro."
            upgradeUrl={upgradeUrl}
          />
        </div>
      )}
    </div>
  )
}

